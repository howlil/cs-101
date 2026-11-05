import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

public class BuildDoctorFixture {
    record Result(int code, String output) {}

    static int compile(JavaCompiler compiler, Path directory, Path... files) {
        List<String> args = new ArrayList<>(List.of("--release", "21", "-d", directory.toString()));
        for (Path file : files) args.add(file.toString());
        ByteArrayOutputStream diagnostic = new ByteArrayOutputStream();
        return compiler.run(null, diagnostic, diagnostic, args.toArray(String[]::new));
    }

    static Result run(Path directory) throws Exception {
        String executable = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process process = new ProcessBuilder(executable, "-cp", directory.toString(), "Main")
                .redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return new Result(process.waitFor(), output);
    }

    public static void main(String[] args) throws Exception {
        if (Runtime.version().feature() != 21) throw new IllegalStateException("Run fixture on JDK 21");
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) throw new IllegalStateException("A JDK (not only JRE) is required");
        Path directory = Files.createTempDirectory("cs101-build-doctor-");
        try {
            Path broken = Files.writeString(directory.resolve("Broken.java"),
                    "public class Broken { MissingLibrary dependency; }");
            if (compile(compiler, directory, broken) == 0)
                throw new AssertionError("Expected missing-symbol compilation failure");
            Path main = Files.writeString(directory.resolve("Main.java"),
                    "public class Main { public static void main(String[] args) { System.out.println(Helper.message()); } }");
            Path helper = Files.writeString(directory.resolve("Helper.java"),
                    "public class Helper { public static String message() { return \"ready\"; } }");
            if (compile(compiler, directory, main, helper) != 0)
                throw new AssertionError("Valid sources did not compile");
            Files.delete(directory.resolve("Helper.class"));
            Result missing = run(directory);
            if (missing.code() == 0 || !missing.output().contains("NoClassDefFoundError"))
                throw new AssertionError("Expected runtime missing-class failure");
            if (compile(compiler, directory, helper) != 0)
                throw new AssertionError("Helper class did not compile on restoration");
            Result restored = run(directory);
            if (restored.code() != 0 || !restored.output().trim().equals("ready"))
                throw new AssertionError("Restored application did not execute");
            System.out.println("java-version=21");
            System.out.println("compile-missing-symbol=failed");
            System.out.println("runtime-missing-class=NoClassDefFoundError");
            System.out.println("restored-run=ready");
        } finally {
            try (var paths = Files.walk(directory)) {
                for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }
}
