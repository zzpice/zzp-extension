import { preferences } from "../../vendor/home/src/features/settings/preferences";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import { NewTab } from "../../src/NewTab";
import "../../vendor/home/src/styles/index.css";
import "../../src/extension.css";
preferences.apply();
createRoot(document.getElementById("app")!).render(
  <HashRouter>
    <NewTab />
  </HashRouter>,
);
