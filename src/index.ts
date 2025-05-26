import { Hono } from "hono";
import middleware from "./middleware";
import comments from "./comment";
import rss from "./rss";

const app = new Hono();

app.route("/", middleware);
app.route("/api/comments", comments);
app.route("/rss", rss);

export default app;
