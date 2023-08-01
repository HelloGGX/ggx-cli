"use strict";

module.exports = core;
const path = require("path");
const semver = require("semver");
const userHome = require("user-home");
const pathExists = require("path-exists").sync;
const colors = require("colors/safe");
const commander = require("commander");
const log = require("@ggx-cli/utils/log");
const init = require("@ggx-cli/init");

const constant = require("./const");
const pkg = require("../package.json");

let args;

const program = new commander.Command();

async function core() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
    // await checkGlobalUpdate();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false);

  program.command("init [name]").option("-f, --force", "是否强制初始化项目").action(init);

  // 开启debug模式
  program.on("option:debug", function () {
    if (program.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
    log.verbose("test");
  });

  // 对未知命令监听
  program.on("command:*", function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red("未知的命令" + obj[0]));
    console.log(colors.red("可用命令:" + availableCommands.join(",")));
  });

  if (program.args && program.args.length < 1) {
    program.outputHelp();
  }
  program.parse(process.argv);
}

async function checkGlobalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm api, 获取所有版本号
  const { getNpmSemverVersion } = require("@ggx-cli/utils/get-npm-info");
  const lastVersion = await getNpmSemverVersion(currentVersion, npmName);
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      "更新提示",
      colors.yellow(
        `请手动更新 ${npmName}, 当前版本： ${currentVersion}, 最新版本：${lastVersion} 更细命令：npm install -g ${npmName}`
      )
    );
  }
  // 3. 提取所有版本号，比对哪些版本号是大于当前版本号
  // 4. 获取最新的版本号, 提示用户更新到该版本号
}

function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
  log.verbose("环境变量", process.env.CLI_HOME_PATH);
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig["cliHome"];
  return cliConfig;
}

function checkInputArgs() {
  const minimist = require("minimist");
  args = minimist(process.argv.slice(2));
  checkArgs();
}

function checkArgs() {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  log.level = process.env.LOG_LEVEL;
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户目录不存在"));
  }
}

function checkNodeVersion() {
  // 获取当前node版本
  const curVersion = process.version;
  // 比对最低版本号
  const lowestVersion = constant.LOWEST_NODE_VERSION;
  // curVersion 没有大于lowestVersion版本号
  if (!semver.gte(curVersion, lowestVersion)) {
    throw new Error(
      colors.red(`ggx-cli 需要安装 v${lowestVersion}以上版本的node`)
    );
  }
}

function checkPkgVersion() {
  log.notice("cli", pkg.version);
}

function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}
