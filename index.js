const { EventEmitter } = require("events");

function writeFunctionError(error) {
  writeFunctionResponse(
    { Error: error instanceof Error ? error.toString() : "an error occurred" },
    process.stderr
  );
}

function writeFunctionResponse(response, stream = process.stdout) {
  stream.write(JSON.stringify(response));
}

class StreamReader extends EventEmitter {
  constructor(stream) {
    super();
    this.chunk = "";
    this.stream = stream;
    this.stream.setEncoding("utf8");
    this.stream.on("data", this.accumulate.bind(this));
    this.stream.on("end", this.end.bind(this));
    this.stream.on("error", this.error.bind(this));
    this.stream.resume();
    this.error = false;
    this.end = false;
  }
  accumulate(chunk) {
    if (this.error || this.end) return;
    this.chunk += chunk;
  }
  error(err) {
    if (this.error || this.end) return;

    this.error = true;
    this.emit("error", err);
  }
  end() {
    if (this.error || this.end) return;

    this.end = true;
    this.emit("end", this.chunk);
  }
}

class JavaScriptControl {
  format(input = "") {
    const prettier = require("prettier");
    return prettier.format(input, {
      parser: "babylon",
      semi: true,
    });
  }
  compile(input = "") {
    const { VMScript } = require("vm2");
    new VMScript(input).compile();
  }
  async execute(input = "") {
    // [{"Message": "hi", "Kind": "stdout", "Delay": 0}, ...]
    return new Promise((resolve, reject) => {
      const events = [];
      const { fork } = require("child_process");
      const child = fork("executor.js", [], {
        env: {},
        cwd: "./",
        stdio: "pipe",
      });
      child.on("error", err => {
        // fork failed
        reject(err);
      });
      try {
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", data => {
          events.push({ Message: data, Kind: "stderr", Delay: 0 });
        });
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", data => {
          events.push({ Message: data, Kind: "stdout", Delay: 0 });
        });
        const watcher = setTimeout(() => {
          try {
            child.kill();
          } catch (e) {
            // do nothing
          }
        }, process.env.NODE_TIMEOUT || 10000);
        child.on("close", () => {
          clearTimeout(watcher);
          resolve(events);
        });
        child.send({ input });
      } catch (err) {
        // synchronous exception
        child.kill();
        throw err;
      }
      // TODO: time out child
    });
  }
}

function main() {
  const stream = new StreamReader(process.stdin);
  stream.on("error", err => {
    writeFunctionError(err);
  });
  stream.on("end", async input => {
    let args;
    try {
      args = JSON.parse(input);
      if (typeof args !== "object") {
        throw new Error("input must be object {...}");
      }
    } catch (err) {
      return writeFunctionError(new Error(`invalid function args: ${err}`));
    }

    if (!args.Mode) {
      return writeFunctionError(new Error("missing mode"));
    }

    try {
      const control = new JavaScriptControl();
      switch (args.Mode) {
        case "compile":
          return writeFunctionResponse({
            Events: await control.execute(args.Body),
          });
        case "fmt":
        case "format": {
          control.compile(args.Body);
          return writeFunctionResponse({ Body: control.format(args.Body) });
        }
        default: {
          throw new Error(`unknown mode: ${args.Mode}`);
        }
      }
    } catch (err) {
      writeFunctionError(err);
    }
  });
}

main();
