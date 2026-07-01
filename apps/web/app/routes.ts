import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("workspace", "routes/workspace.tsx"),
  route("result/:name", "routes/result.$name.tsx"),
] satisfies RouteConfig;
