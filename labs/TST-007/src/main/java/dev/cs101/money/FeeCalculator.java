package dev.cs101.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

/**
 * Educational deterministic fee policy, NOT a production tariff, FX conversion, or ledger.
 * Both currencies use 1.5%; principal max is 1,000,000 in the selected currency.
 * IDR has scale 0 and USD has scale 2; fee uses HALF_UP after exact multiplication.
 */
public final class FeeCalculator {
    private static final BigDecimal RATE = new BigDecimal("0.015");
    private static final BigDecimal MAX_PRINCIPAL = new BigDecimal("1000000");

    public BigDecimal calculateFee(BigDecimal principal, String currency) {
        Objects.requireNonNull(principal, "principal");
        Objects.requireNonNull(currency, "currency");

        int scale = switch (currency) {
            case "IDR" -> 0;
            case "USD" -> 2;
            default -> throw new IllegalArgumentException("Unsupported currency: " + currency);
        };
        if (principal.signum() < 0) {
            throw new IllegalArgumentException("Principal must be non-negative");
        }
        if (principal.compareTo(MAX_PRINCIPAL) > 0) {
            throw new IllegalArgumentException("Principal exceeds lab maximum");
        }
        // Validate monetary input precision: never silently round the principal.
        BigDecimal exactPrincipal = principal.setScale(scale, RoundingMode.UNNECESSARY);
        return exactPrincipal.multiply(RATE).setScale(scale, RoundingMode.HALF_UP);
    }
}
