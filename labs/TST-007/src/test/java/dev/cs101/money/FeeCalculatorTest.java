package dev.cs101.money;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Pure Java behavior tests. No Spring context, database, mocks, or runtime state. */
@DisplayName("TST-007 Money Unit Tests — observable fee policy")
class FeeCalculatorTest {
    private FeeCalculator calculator;

    @BeforeEach
    void prepareCalculator() {
        calculator = new FeeCalculator();
    }

    private static BigDecimal money(String decimal) {
        return new BigDecimal(decimal);
    }

    @Test
    void normalIdrReturnsExactlyOneHundredFifty() {
        assertEquals(money("150"), calculator.calculateFee(money("10000"), "IDR"));
    }

    @Test
    void normalUsdReturnsExactlyOneDollarFifty() {
        assertEquals(money("1.50"), calculator.calculateFee(money("100.00"), "USD"));
    }

    @Test
    void idrZeroReturnsScaleZero() {
        assertEquals(money("0"), calculator.calculateFee(money("0"), "IDR"));
    }

    @Test
    void usdZeroReturnsScaleTwo() {
        assertEquals(money("0.00"), calculator.calculateFee(money("0.00"), "USD"));
    }

    @Test
    void negativeIdrPrincipalIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateFee(money("-1"), "IDR"));
    }

    @Test
    void negativeUsdPrincipalIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateFee(money("-0.01"), "USD"));
    }

    @Test
    void exactMaximumIdrIsAccepted() {
        assertEquals(money("15000"),
                calculator.calculateFee(money("1000000"), "IDR"));
    }

    @Test
    void exactMaximumUsdIsAccepted() {
        assertEquals(money("15000.00"),
                calculator.calculateFee(money("1000000.00"), "USD"));
    }

    @Test
    void aboveMaximumIdrIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateFee(money("1000001"), "IDR"));
    }

    @Test
    void aboveMaximumUsdIsRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateFee(money("1000000.01"), "USD"));
    }

    @Test
    void idrBelowRoundingThresholdStaysZero() {
        assertEquals(money("0"), calculator.calculateFee(money("33"), "IDR"));
    }

    @Test
    void idrAboveRoundingThresholdBecomesOne() {
        assertEquals(money("1"), calculator.calculateFee(money("34"), "IDR"));
    }

    @Test
    void usdBelowRoundingThresholdStaysZeroCents() {
        assertEquals(money("0.00"), calculator.calculateFee(money("0.33"), "USD"));
    }

    @Test
    void usdAboveRoundingThresholdBecomesOneCent() {
        assertEquals(money("0.01"), calculator.calculateFee(money("0.34"), "USD"));
    }

    @Test
    void idrPrincipalWithFractionalRupiahIsRejected() {
        assertThrows(ArithmeticException.class,
                () -> calculator.calculateFee(money("1.50"), "IDR"));
    }

    @Test
    void usdPrincipalWithThreeDecimalsIsRejected() {
        assertThrows(ArithmeticException.class,
                () -> calculator.calculateFee(money("1.001"), "USD"));
    }

    @Test
    void unsupportedCurrencyIsRejectedRatherThanConverted() {
        assertThrows(IllegalArgumentException.class,
                () -> calculator.calculateFee(money("100"), "EUR"));
    }

    @Test
    void nullPrincipalIsRejected() {
        assertThrows(NullPointerException.class,
                () -> calculator.calculateFee(null, "IDR"));
    }

    @Test
    void nullCurrencyIsRejected() {
        assertThrows(NullPointerException.class,
                () -> calculator.calculateFee(money("100"), null));
    }

    @Test
    void sameNumericPrincipalUsesCurrencyScaleNotExchangeRate() {
        assertEquals(money("2"), calculator.calculateFee(money("100"), "IDR"));
        assertEquals(money("1.50"), calculator.calculateFee(money("100.00"), "USD"));
    }
}
