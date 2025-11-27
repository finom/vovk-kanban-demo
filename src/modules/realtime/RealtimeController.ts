import { prefix, post, HttpException, HttpStatus } from "vovk";
import { z } from "zod";
import { withZod } from "@/lib/withZod";
import { sessionGuard } from "@/decorators/sessionGuard";

@prefix("realtime")
export default class RealtimeController {
  @post("session")
  @sessionGuard()
  static session = withZod({
    query: z.object({
      voice: z.enum(["ash", "ballad", "coral", "sage", "verse"]),
    }),
    body: z.object({ sdp: z.string() }),
    output: z.object({ sdp: z.string() }),
    async handle(req) {
      const sessionConfig = JSON.stringify({
        type: "realtime",
        model: "gpt-realtime",
        audio: { output: { voice: req.vovk.query().voice } },
      });

      const fd = new FormData();
      fd.set("sdp", (await req.vovk.body()).sdp);
      fd.set("session", sessionConfig);

      try {
        const r = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: fd,
        });
        // Send back the SDP we received from the OpenAI REST API
        const sdp = await r.text();
        return { sdp };
      } catch (error) {
        throw new HttpException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          "Failed to generate token. " + String(error),
        );
      }
    },
  });
}
