import { spawn } from "child_process";

export default function runPythonScript(inputData) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python3", ["./src/run.py"]);

    // Pass data to the Python script
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();

    let output = "";

    // Collect Python script output
    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    // Handle errors
    pythonProcess.stderr.on("data", (data) => {
      console.error(`Error: ${data}`);
    });

    // Resolve promise when the script finishes
    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        reject(`Python script exited with code ${code}`);
      } else {
        try {
          resolve(JSON.parse(output));
        } catch (error) {
          reject(`Error parsing output: ${error}`);
        }
      }
    });
  });
}