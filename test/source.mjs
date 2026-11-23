// The card source the tests evaluate: src/ bundled by esbuild as scripts/build.mjs does (one flat classic script),
// placeholders (__VERSION__, __IMG_LOGO_*__) left as they are.
import { bundle } from "../scripts/build.mjs";

export const source = await bundle();
