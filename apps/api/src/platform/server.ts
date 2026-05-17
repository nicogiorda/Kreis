import { config } from "../core/config";
import { createApp } from "./app";

const app = createApp();

app.listen(config.API_PORT, () => {
  console.log(`Kreis API listening on http://localhost:${config.API_PORT}`);
});
