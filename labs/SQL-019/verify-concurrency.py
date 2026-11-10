#!/usr/bin/env python3
"""Prove SQL-019 with overlapping live PostgreSQL sessions, not simulated locks."""
from __future__ import annotations

import os
from pathlib import Path
import selectors
import subprocess
import sys
import time

CONTAINER = sys.argv[1]
INIT = (Path(__file__).resolve().parent / "init.sql").read_text(encoding="utf-8")


def command(args: list[str], sql: str | None = None) -> str:
    result = subprocess.run(args, input=sql, text=True, capture_output=True, timeout=12)
    if result.returncode:
        raise AssertionError(f"Failed {args}: {result.stderr[-800:]}")
    return result.stdout.strip()


def psql(db: str, sql: str) -> str:
    return command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
         "-d", db, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], sql
    )


def fresh_db(db: str) -> str:
    command(["docker", "exec", CONTAINER, "createdb", "-U", "postgres", db])
    psql(db, INIT)
    return db


class Session:
    def __init__(self, db: str):
        self.proc = subprocess.Popen(
            ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
             "-d", db, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            bufsize=0,
        )
        self.output = bytearray()

    def send(self, text: str) -> None:
        assert self.proc.stdin is not None
        self.proc.stdin.write(text.encode("utf-8"))
        self.proc.stdin.flush()

    def until(self, marker: str) -> None:
        assert self.proc.stdout is not None
        deadline = time.monotonic() + 12
        with selectors.DefaultSelector() as selector:
            selector.register(self.proc.stdout, selectors.EVENT_READ)
            while marker.encode() not in self.output:
                if self.proc.poll() is not None:
                    raise AssertionError(f"Session died before {marker}: {self.output[-800:]!r}")
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise AssertionError(f"Session timeout before {marker}: {self.output[-800:]!r}")
                if selector.select(remaining):
                    data = os.read(self.proc.stdout.fileno(), 4096)
                    if data:
                        self.output.extend(data)

    def finish(self) -> tuple[int, str]:
        if self.proc.stdin is not None:
            try:
                self.proc.stdin.close()
            except BrokenPipeError:
                pass
            self.proc.stdin = None
        rest, _ = self.proc.communicate(timeout=12)
        self.output.extend(rest)
        return self.proc.returncode, self.output.decode(errors="replace")

    def abort(self) -> None:
        if self.proc.poll() is None:
            self.proc.kill()
            self.proc.wait(timeout=3)
        if self.proc.stdout:
            self.proc.stdout.close()


def begin(session: Session, label: str) -> None:
    session.send(
        "BEGIN;\n"
        f"SET LOCAL application_name='{label}';\n"
        "SET LOCAL lock_timeout='8s';\n"
        "SET LOCAL statement_timeout='10s';\n"
        "SET LOCAL idle_in_transaction_session_timeout='20s';\n"
    )


def require_lock_wait(db: str, label: str) -> None:
    deadline = time.monotonic() + 6
    while time.monotonic() < deadline:
        result = psql(
            db, "SELECT count(*) FROM pg_stat_activity "
            f"WHERE application_name='{label}' AND wait_event_type='Lock';"
        )
        if result == "1":
            return
        time.sleep(0.08)  # polls a real lock event, never assumes time == overlap
    raise AssertionError(f"No actual PostgreSQL row-lock wait: {label}")


def guarded_debit(amount: int, key: str) -> str:
    return (
        "DO $$ DECLARE changed BIGINT; BEGIN\n"
        f"UPDATE cs101_sql019.accounts SET balance=balance-{amount}.00 "
        f"WHERE account_id='W-01' AND balance>={amount}.00;\n"
        "GET DIAGNOSTICS changed=ROW_COUNT;\n"
        "IF changed<>1 THEN RAISE EXCEPTION 'insufficient funds'; END IF;\n"
        "END $$;\n"
        "INSERT INTO cs101_sql019.withdrawals(withdrawal_id,account_id,amount) "
        f"VALUES('{key}','W-01',{amount}.00);\n"
    )


def check_wallet(db: str) -> None:
    actual = psql(
        db,
        "SELECT 'balance='||balance::text FROM cs101_sql019.accounts WHERE account_id='W-01';\n"
        "SELECT 'withdrawals='||count(*)::text FROM cs101_sql019.withdrawals;\n"
        "SELECT 'withdrawn='||coalesce(sum(amount),0)::numeric(14,2)::text "
        "FROM cs101_sql019.withdrawals;\n",
    ).splitlines()
    if actual != ["balance=20.00", "withdrawals=1", "withdrawn=80.00"]:
        raise AssertionError(f"Wallet invariant failed: {actual!r}")


def wallet_race(mode: str) -> None:
    db = fresh_db("sql019_" + mode)
    first, second = Session(db), Session(db)
    try:
        begin(first, "sql019-first-" + mode)
        if mode == "locking":
            first.send("SELECT balance FROM cs101_sql019.accounts "
                       "WHERE account_id='W-01' FOR UPDATE;\n")
        else:
            first.send("UPDATE cs101_sql019.accounts SET balance=balance-80.00 "
                       "WHERE account_id='W-01' AND balance>=80.00;\n")
        first.send("\\echo first-held\n")
        first.until("first-held")

        begin(second, "sql019-second-" + mode)
        if mode == "locking":
            second.send("SELECT balance FROM cs101_sql019.accounts "
                        "WHERE account_id='W-01' FOR UPDATE;\n"
                        "\\echo second-after-lock\n")
        else:
            second.send(guarded_debit(70, "W-SECOND"))
        require_lock_wait(db, "sql019-second-" + mode)

        if mode == "locking":
            first.send(guarded_debit(80, "W-FIRST"))
        else:
            first.send(
                "INSERT INTO cs101_sql019.withdrawals(withdrawal_id,account_id,amount) "
                "VALUES('W-FIRST','W-01',80.00);\n"
            )
        first.send("COMMIT;\n\\echo first-committed\n")
        first.until("first-committed")
        code, output = first.finish()
        if code != 0:
            raise AssertionError("First withdrawal failed: " + output[-500:])

        if mode == "locking":
            second.until("second-after-lock")
            if "20.00" not in second.output.decode(errors="replace"):
                raise AssertionError("Second locked SELECT did not read new balance")
            second.send(guarded_debit(70, "W-SECOND"))
        code, output = second.finish()
        if code == 0 or "insufficient funds" not in output:
            raise AssertionError("Second withdrawal did not reject: " + output[-500:])
        check_wallet(db)
        print(f"sql019-{mode}-overlap=observed", flush=True)
        print(f"sql019-{mode}-one-success=verified", flush=True)
    finally:
        first.abort()
        second.abort()


def transfer(amount: int, source: str, dest: str, key: str) -> str:
    return (
        "DO $$ DECLARE changed BIGINT; BEGIN\n"
        f"UPDATE cs101_sql019.accounts SET balance=balance-{amount}.00 "
        f"WHERE account_id='{source}' AND balance>={amount}.00;\n"
        "GET DIAGNOSTICS changed=ROW_COUNT;\n"
        "IF changed<>1 THEN RAISE EXCEPTION 'source unavailable'; END IF;\n"
        f"UPDATE cs101_sql019.accounts SET balance=balance+{amount}.00 "
        f"WHERE account_id='{dest}';\n"
        "GET DIAGNOSTICS changed=ROW_COUNT;\n"
        "IF changed<>1 THEN RAISE EXCEPTION 'target unavailable'; END IF;\n"
        "END $$;\n"
        "INSERT INTO cs101_sql019.transfers(transfer_id,source_id,destination_id,amount) "
        f"VALUES('{key}','{source}','{dest}',{amount}.00);\n"
    )


def ordered_transfers() -> None:
    db = fresh_db("sql019_order")
    first, second = Session(db), Session(db)
    lock_sql = ("SELECT account_id FROM cs101_sql019.accounts "
                "WHERE account_id IN ('A-01','A-02') ORDER BY account_id FOR UPDATE;\n")
    try:
        begin(first, "sql019-order-first")
        first.send(lock_sql + "\\echo first-held\n")
        first.until("first-held")
        begin(second, "sql019-order-second")
        second.send(lock_sql + "\\echo second-after-lock\n")
        require_lock_wait(db, "sql019-order-second")
        first.send(transfer(40, "A-01", "A-02", "T-FORWARD"))
        first.send("COMMIT;\n\\echo first-committed\n")
        first.until("first-committed")
        code, output = first.finish()
        if code:
            raise AssertionError("Forward transfer failed: " + output[-500:])
        second.until("second-after-lock")
        second.send(transfer(30, "A-02", "A-01", "T-REVERSE"))
        second.send("COMMIT;\n\\echo second-committed\n")
        second.until("second-committed")
        code, output = second.finish()
        if code:
            raise AssertionError("Reverse transfer failed: " + output[-500:])
        actual = psql(
            db, "SELECT account_id||'='||balance::text FROM cs101_sql019.accounts "
            "WHERE account_id IN ('A-01','A-02') ORDER BY account_id;\n"
            "SELECT 'transfers='||count(*)::text FROM cs101_sql019.transfers;\n"
            "SELECT 'total='||sum(balance)::text FROM cs101_sql019.accounts "
            "WHERE account_id IN ('A-01','A-02');\n",
        ).splitlines()
        expected = ["A-01=90.00", "A-02=110.00", "transfers=2", "total=200.00"]
        if actual != expected:
            raise AssertionError(f"Ordered transfer invariant failed: {actual!r}")
        print("sql019-ordered-lock-overlap=observed", flush=True)
        print("sql019-opposing-transfers=no-deadlock", flush=True)
    finally:
        first.abort()
        second.abort()


if __name__ == "__main__":
    wallet_race("locking")
    wallet_race("conditional")
    ordered_transfers()
    print("sql019-postgres16=verified", flush=True)
