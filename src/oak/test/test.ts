import { parseBody, router } from "../setupOak.ts";

export default () => {
  router.post("/github/push/:guildId", async (ctx) => {
    const body = await parseBody<any>(ctx);

    console.log({ body });

    ctx.response.status = 200;
  });
};
