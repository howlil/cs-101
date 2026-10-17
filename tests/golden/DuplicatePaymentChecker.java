import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

public class DuplicatePaymentChecker {
    // A value object: the canonical constructor validates every external input.
    record PaymentKey(String reference, String merchantId) {
        PaymentKey {
            Objects.requireNonNull(reference, "reference");
            Objects.requireNonNull(merchantId, "merchantId");
            if (reference.isBlank() || merchantId.isBlank()) {
                throw new IllegalArgumentException("Payment identifier must not be blank");
            }
        }
    }

    public static void main(String[] args) {
        PaymentKey first = new PaymentKey("00041", "store-a");
        PaymentKey replay = new PaymentKey("00041", "store-a");
        PaymentKey anotherMerchant = new PaymentKey("00041", "store-b");

        System.out.println("same-object=" + (first == replay));
        System.out.println("equal-value=" + first.equals(replay));
        System.out.println("equal-hash=" + (first.hashCode() == replay.hashCode()));

        Set<PaymentKey> seen = new HashSet<>();
        System.out.println("first-accepted=" + seen.add(first));
        System.out.println("replay-accepted=" + seen.add(replay));
        System.out.println("other-merchant-accepted=" + seen.add(anotherMerchant));
        System.out.println("unique-payments=" + seen.size());

        try {
            new PaymentKey("", "store-a");
            System.out.println("invalid-rejected=false");
        } catch (IllegalArgumentException expected) {
            System.out.println("invalid-rejected=true");
        }
    }
}
