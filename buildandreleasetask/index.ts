import tl = require("azure-pipelines-task-lib/task");
import child_process = require("child_process");
import fs = require("fs");

async function run() {
  try {
    // get inputs
    const projectPath = tl.getInput("projectPath", true);
    const exportPath = tl.getInput("exportPath", false);
    const otherOptions = tl.getInput("otherOptions", false);

    const agentTempDirectory = tl.getVariable("Agent.ToolsDirectory");
    const scsInstallationPath = `${agentTempDirectory}/scs`;
    // install security-scan dotnet tool
    const installResult = child_process.execSync(`dotnet tool update security-scan --tool-path ${scsInstallationPath}`).toString("utf-8");
    console.log(`##vso[task.debug] ${installResult}`);

    // build scan command
    let command = `${scsInstallationPath}/security-scan`;
    if (exportPath && exportPath.length > 0) {
      command += ` -x "${exportPath}"`;
    }
    if (otherOptions && otherOptions.length > 0) {
      command += ` ${otherOptions}`;
    }
    command += ` ${projectPath}`;

    console.log(`##vso[task.debug]command=${command}`);

    // run scan command
    const scanResult = child_process.execSync(command).toString("utf-8");
    console.log(`##vso[task.debug] ${scanResult}`);
  } catch (err: any) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  } finally {
    try {
      const exportPath: string | undefined = tl.getInput("exportPath", false);
      const convertPath: boolean | undefined = tl.getBoolInput("convertPath", false);

      if (convertPath && exportPath && exportPath.length > 0) {
        const content = fs.readFileSync(exportPath).toString("utf-8");
        const sourcesDirectory = tl.getVariable("Build.SourcesDirectory") || "";
        const sourceVersion = tl.getVariable("Build.SourceVersion") || "";
        // get base repository uri
        const repositoryUri = tl.getVariable('Build.Repository.Uri') || "";
        const chunks = repositoryUri!.replace("https://", "").split("@")
        let baseUri = chunks[0];
        if(chunks?.length > 1)
        {
          baseUri = chunks[1];
        }

        const generateUri = (location: any) => {
          const toReplace = sourcesDirectory?.replace(/\\/g, '/');
          const path = location.physicalLocation.artifactLocation.uri.replace(`file:///${toReplace}`, "");
          let uri = `https://${baseUri}?path=${path}&version=GC${sourceVersion}`;
          uri += `&line=${location.physicalLocation.region.startLine}`;
          uri += `&lineEnd=${location.physicalLocation.region.endLine}`;
          uri += `&lineStartColumn=${location.physicalLocation.region.startColumn}`;
          uri += `&lineEndColumn=${location.physicalLocation.region.endColumn}`;
          return uri;
        }

        const obj = JSON.parse(content) as any;
        for (const run of obj.runs || []) {
          for (const result of run.results || []) {
            // locations
            for (const location of result.locations || []) {
              location.physicalLocation.artifactLocation.uri = generateUri(location);
            }
            // relatedLocations
            for (const location of result.relatedLocations || []) {
              location.physicalLocation.artifactLocation.uri = generateUri(location);
            }
          }
        }

        const scanContent = JSON.stringify(obj);
        console.log(`##vso[task.debug] ${scanContent}`);
        fs.writeFileSync(exportPath, scanContent);
      }
    } catch (err: any) {
      tl.setResult(tl.TaskResult.Failed, err.message);
    }
  }
}

run();
