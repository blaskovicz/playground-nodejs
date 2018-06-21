process.on("uncaughtException", err => {
  process.stderr.write(err.toString());
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

process.on("message", ({ input }) => {
  const { NodeVM } = require("vm2");
  const vm = new NodeVM({
    sandbox: {},
    require: false,
    console: "inherit",
  });
  vm.run(input);

  // eslint-disable-next-line no-process-exit
  process.exit(0);
});
