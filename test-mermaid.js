import { execSync } from "child_process";
execSync("npm install -g @mermaid-js/mermaid-cli");
try {
  execSync(
    'echo "graph LR\n    DICT[\\"Dictionary\\"] -.->|\\"Future: click-to-lookup<br/>inside LinguBreak results\\"| LB" > test.mmd',
  );
  execSync("mmdc -i test.mmd -o output.png");
  console.log("Success");
} catch (e) {
  console.log("Error:", e.message);
}
