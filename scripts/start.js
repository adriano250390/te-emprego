'use strict';

// Definindo os ambientes
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

// Faz com que o script quebre em rejeições não tratadas
process.on('unhandledRejection', (err) => {
  throw err;
});

// Lê variáveis de ambiente
require('../config/env');

const fs = require('fs');
const chalk = require('chalk'); // Agora usamos o chalk diretamente
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');

// A maioria das funções de utilitários do CRA ainda existem,
// mas alguns nomes podem ter mudado na versão mais recente
const clearConsole = require('react-dev-utils/clearConsole');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {
  choosePort,
  createCompiler,
  prepareProxy,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const openBrowser = require('react-dev-utils/openBrowser');

const { checkBrowsers } = require('react-dev-utils/browsersHelper');

const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const createDevServerConfig = require('../config/webpackDevServer.config');

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

// Se os arquivos essenciais (HTML e Index) não existirem, interrompe
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
  process.exit(1);
}

// Porta e host default
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

if (process.env.HOST) {
  console.log(
    chalk.cyan(
      `Tentando utilizar a variável de ambiente HOST: ${chalk.yellow(
        chalk.bold(process.env.HOST)
      )}`
    )
  );
  console.log(
    `Se isso foi sem querer, verifique se não setou essa variável indevidamente no seu shell.`
  );
  console.log(
    `Mais informações: ${chalk.yellow('https://bit.ly/CRA-advanced-config')}`
  );
  console.log();
}

// Checa compatibilidade de browsers a partir do browserslist
checkBrowsers(paths.appPath, isInteractive)
  .then(() => {
    return choosePort(HOST, DEFAULT_PORT);
  })
  .then((port) => {
    if (port == null) {
      // Não encontrou uma porta livre
      return;
    }

    // Carrega a config de Webpack para 'development'
    const config = configFactory('development');
    const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
    const appName = require(paths.appPackageJson).name;
    const useTypeScript = fs.existsSync(paths.appTsConfig);
    const urls = prepareUrls(protocol, HOST, port);

    // A API mais recente do dev-server/CRA usa sendMessage em vez de sockWrite:
    // Vamos passar esse "devSocket" para o createCompiler, que repassa para o devServer
    const devSocket = {
      warnings: (warnings) => {
        if (devServer) {
          devServer.sendMessage(devServer.webSocketServer.clients, 'warnings', warnings);
        }
      },
      errors: (errors) => {
        if (devServer) {
          devServer.sendMessage(devServer.webSocketServer.clients, 'errors', errors);
        }
      },
    };

    // Cria o compilador Webpack com mensagens customizadas
    const compiler = createCompiler({
      appName,
      config,
      devSocket,
      urls,
      useYarn,
      useTypeScript,
      webpack,
    });

    // Se houver configuração de proxy no package.json, carrega
    const proxySetting = require(paths.appPackageJson).proxy;
    const proxyConfig = prepareProxy(proxySetting, paths.appPublic);

    // Configurações específicas do devServer (CORS, historyApiFallback, etc)
    const serverConfig = createDevServerConfig(proxyConfig, urls.lanUrlForConfig);

    // Instancia o WebpackDevServer com o compilador e configurações
    const devServer = new WebpackDevServer(compiler, serverConfig);

    // Inicia o servidor
    devServer.listen(port, HOST, (err) => {
      if (err) {
        return console.log(err);
      }
      if (isInteractive) {
        clearConsole();
      }

      // Aviso sobre o NODE_PATH deprecado (ainda presente no CRA)
      if (process.env.NODE_PATH) {
        console.log(
          chalk.yellow(
            'A configuração de NODE_PATH está obsoleta em favor de baseUrl no jsconfig.json ou tsconfig.json.'
          )
        );
        console.log();
      }

      console.log(chalk.cyan('Iniciando o servidor de desenvolvimento...\n'));
      openBrowser(urls.localUrlForBrowser);
    });

    // Finaliza o servidor corretamente no CTRL+C
    ['SIGINT', 'SIGTERM'].forEach((sig) => {
      process.on(sig, () => {
        devServer.close();
        process.exit();
      });
    });
  })
  .catch((err) => {
    if (err && err.message) {
      console.log(err.message);
    }
    process.exit(1);
  });
