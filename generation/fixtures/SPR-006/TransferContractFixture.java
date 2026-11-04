import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** JDK 21 HTTP contract fixture, NOT a Spring MVC runtime. */
public class TransferContractFixture {
  static final class TransferService {
    private final Map<String, String> data = new ConcurrentHashMap<>();
    String create(String payload) {
      String id = "tr-001";
      data.put(id, payload);
      return id;
    }
    String find(String id) { return data.get(id); }
  }

  static void respond(HttpExchange exchange, int status, String body) throws java.io.IOException {
    byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
    exchange.sendResponseHeaders(status, bytes.length);
    try (var output = exchange.getResponseBody()) { output.write(bytes); }
  }

  public static void main(String[] args) throws Exception {
    var service = new TransferService();
    var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/transfers", exchange -> {
      try {
        var path = exchange.getRequestURI().getPath();
        if (path.equals("/transfers") && exchange.getRequestMethod().equals("POST")) {
          var payload = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
          if (payload.isBlank()) { respond(exchange, 400, "invalid"); return; }
          var id = service.create(payload);
          exchange.getResponseHeaders().set("Location", "/transfers/" + id);
          respond(exchange, 201, id);
        } else if (path.startsWith("/transfers/") && exchange.getRequestMethod().equals("GET")) {
          var payload = service.find(path.substring("/transfers/".length()));
          if (payload == null) respond(exchange, 404, "missing");
          else respond(exchange, 200, payload);
        } else respond(exchange, 404, "unmapped");
      } finally { exchange.close(); }
    });
    server.start();
    try (var client = HttpClient.newHttpClient()) {
      var root = "http://127.0.0.1:" + server.getAddress().getPort();
      var created = client.send(HttpRequest.newBuilder(URI.create(root + "/transfers"))
          .POST(HttpRequest.BodyPublishers.ofString("amount=100")).build(), HttpResponse.BodyHandlers.ofString());
      var found = client.send(HttpRequest.newBuilder(URI.create(root + "/transfers/tr-001"))
          .GET().build(), HttpResponse.BodyHandlers.ofString());
      var missing = client.send(HttpRequest.newBuilder(URI.create(root + "/transfers/missing"))
          .GET().build(), HttpResponse.BodyHandlers.ofString());
      var invalid = client.send(HttpRequest.newBuilder(URI.create(root + "/transfers"))
          .POST(HttpRequest.BodyPublishers.ofString("")).build(), HttpResponse.BodyHandlers.ofString());
      if (created.statusCode() != 201 ||
          !"/transfers/tr-001".equals(created.headers().firstValue("Location").orElse("")) ||
          found.statusCode() != 200 || !"amount=100".equals(found.body()) ||
          missing.statusCode() != 404 || invalid.statusCode() != 400)
          throw new AssertionError("HTTP contract not met");
      System.out.println("post-status=" + created.statusCode());
      System.out.println("location=" + created.headers().firstValue("Location").orElse("missing"));
      System.out.println("get-status=" + found.statusCode());
      System.out.println("missing-status=" + missing.statusCode());
      System.out.println("invalid-status=" + invalid.statusCode());
    } finally { server.stop(0); }
  }
}
