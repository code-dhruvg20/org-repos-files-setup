
var fs, repoJson, fileJson, branch_arr, gitHubFileListStr;

require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const csvtojsonV2 = require("csvtojson");
fs = require('fs');

const repoListCsv = process.env.REPO_LIST_CSV;
const fileListCsv = process.env.FILE_LIST_CSV;

console.log(process.env.GITHUB_BRANCH);
branch_arr = JSON.parse(process.env.GITHUB_BRANCH);
//branch_arr = ["integration"];

var dateTime = new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString().split('.')[0];
var GLOBALS = {};

GLOBALS._debug = false;
GLOBALS._delete = false;

if (process.env.DEL_FILES == "true") {
  GLOBALS._delete = true;
}
if (process.env.DEBUG_MODE == "true") {
  GLOBALS._debug = true;
}

if (process.env.GITHUB_BRANCH_PROTECTION_OVERRIDE == "true") {
  GLOBALS.branchProtectionOverride = true;
} else {
  GLOBALS.branchProtectionOverride = false;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function repoSetup(repoName, branchName) {

  var resp, branchProtectionData, default_branch, repoBranchData, sha, failureFlag, filePath, githubPath;

  repoBranchData = GLOBALS.repoBranch.data;

  failureFlag = false;

  resp = await octokit.repos.get({
    owner: process.env.GITHUB_ORGANIZATION,
    repo: repoName,
  });

  if (resp.data.size == 0) {
    console.log(`${repoName} : ${branchName}: UPDATE : Repository Not Initialized`);
    return false;
  }

  default_branch = resp.data.default_branch;
  GLOBALS._debug == true ? console.log(default_branch) : null;

  var branchList = repoBranchData;
  var branch_data = branchList.filter(elem => elem.name == branchName)[0];
  var defaultBranch = branchList.filter(elem => elem.name == default_branch)[0];

  GLOBALS._debug == true ? console.log(branch_data) : null;
  GLOBALS._debug == true ? console.log(defaultBranch) : null;


  //console.log(defaultBranch);
  try {
    if (branch_data == undefined) {
      resp = await octokit.git.createRef({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        ref: "refs/heads/" + branchName,
        sha: defaultBranch.commit.sha,
      });
      GLOBALS._debug == true ? console.log(resp) : null;
      branch_data = {};
      branch_data.protected = false;
    }
    GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} createRef: SUCCESSFULL`) : null;
  } catch (e) {
    failureFlag = true;
    console.log(`${repoName} : ${branchName} : createRef: failed`);
    console.log('Error:', e.stack);
  }


  //console.log(`${repoName} : ${branchName} : branch_data.protected : ${branch_data.protected} `);
  if (GLOBALS.branchProtectionOverride == true && branch_data.protected == true) {
    try {
      resp = await octokit.repos.getBranchProtection({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        branch: branchName,
      });
      GLOBALS._debug == true ? console.log(resp) : null;
      branchProtectionData = resp.data;
      GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} : getBranchProtection: SUCCESSFULL`) : null;
    } catch (e) {
      failureFlag = true;
      console.log(` ${repoName} : ${branchName} : getBranchProtection: FAILED`);
      console.log('Error:', e.stack);
    }


    try {
      resp = await octokit.repos.deleteBranchProtection({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        branch: branchName,
      });
      GLOBALS._debug == true ? console.log(resp) : null;
      GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} : deleteBranchProtection: SUCCESSFULL`) : null;
    } catch (e) {
      failureFlag = true;
      console.log(`${repoName} : ${branchName} deleteBranchProtection: FAILED`);
      console.log('Error:', e.stack);
    }
  }

  if (branch_data.protected == false || (GLOBALS.branchProtectionOverride == true && branch_data.protected == true)) {


    for(var i = 0;i<fileJson.length;i++){
      githubPath = fileJson[i].github_path;
      fileContent = fileJson[i].file_content;
      try {
        resp = await octokit.repos.getContent({
          owner: process.env.GITHUB_ORGANIZATION,
          repo: repoName,
          path: githubPath,
          ref: branchName
        });
        sha = resp.data.sha;
        GLOBALS._debug == true ? console.log(resp) : null;
        GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} : getContent: File Exists : ${githubPath}`) : null;
      } catch (e) {
        //failureFlag = true;
        sha = null;
        GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} : getContent: File Does Not Exist : ${githubPath}`): null;
        //console.log('Error:', e.stack);
      }
  
      resp = await addDelFile2Repo(repoName, githubPath, branchName, fileContent, sha);

    }

  }

  if (GLOBALS.branchProtectionOverride == true && branch_data.protected == true) {
    try {
      resp = await octokit.repos.updateBranchProtection({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        branch: branchName,
        required_status_checks: branchProtectionData.required_status_checks == undefined ? null : branchProtectionData.required_status_checks,
        enforce_admins: branchProtectionData.enforce_admins == undefined ? null : branchProtectionData.enforce_admins.enabled,
        required_pull_request_reviews: branchProtectionData.required_pull_request_reviews == undefined ? null : branchProtectionData.required_pull_request_reviews,
        restrictions: branchProtectionData.restrictions == undefined ? null : branchProtectionData.restrictions,
        required_linear_history: branchProtectionData.required_linear_history == undefined ? null : branchProtectionData.required_linear_history.enabled,
        allow_force_pushes: branchProtectionData.allow_force_pushes == undefined ? null : branchProtectionData.allow_force_pushes.enabled,
        allow_deletions: branchProtectionData.allow_deletions == undefined ? null : branchProtectionData.allow_deletions.enabled
      })
      GLOBALS._debug == true ? console.log(resp) : null;
      GLOBALS._debug == true ? console.log(`\n updateBranchProtection: successfull : repoName : ${repoName} : branchName : ${branchName}`) : null;
    } catch (e) {
      failureFlag = true;
      console.log(`\n updateBranchProtection: failed : repoName : ${repoName} : branchName : ${branchName}`);
      console.log('Error:', e.stack);
    }
  }

  if (GLOBALS.branchProtectionOverride == false && branch_data.protected == true) {
    console.log(`${repoName} : ${branchName} : UPDATE : Action and Config Files Not Created: ENV.GITHUB_BRANCH_PROTECTION_OVERRIDE: ${GLOBALS.branchProtectionOverride} : Branch-Protected: ${branch_data.protected}`);
  }

  if (failureFlag == true) {
    console.log(`${repoName} : ${branchName} : END : CHECK : Check Repository's - Branch Protection and${gitHubFileListStr}`);
  } else {
    if (GLOBALS._delete == true) {
      console.log(`${repoName} : ${branchName} : END : SUCCESSFULL - Deleted Repository's - Files -${gitHubFileListStr}`);
    } else {
      console.log(`${repoName} : ${branchName} : END : SUCCESSFULL - Added Repository's - Files -${gitHubFileListStr}`);
    }
  }

}

async function addDelFile2Repo(repoName, filePath, branchName, content, sha) {
  try {
    //console.log("resp.data.sha: "+sha);
    let resp;
    if (GLOBALS._delete == false) {
      resp = await octokit.repos.createOrUpdateFileContents({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        path: filePath,
        branch: branchName,
        message: "PR-Process: api create",
        sha: sha,
        content: Buffer.from(content).toString('base64'),
        "committer.name": process.env.GIT_NAME,
        "committer.email": process.env.GIT_EMAIL,
        "author.name": process.env.GIT_NAME,
        "author.email": process.env.GIT_EMAIL
      })
      GLOBALS._debug == true ? console.log(resp) : null;
      GLOBALS._debug == true ? console.log(`${repoName} : ${branchName} : createOrUpdateFileContents: SUCCESSFULL`) : null;
    }


    if (GLOBALS._delete == true) {
      if (sha != null) {
        resp = await octokit.repos.deleteFile({
          owner: process.env.GITHUB_ORGANIZATION,
          repo: repoName,
          path: filePath,
          message: "PR-Process: api delete",
          branch: branchName,
          sha: sha,
        });
      }
    }

    return resp;

  } catch (e) {
    failureFlag = true;
    console.log(`${repoName} : ${branchName} : createOrUpdateFileContents : func_addDelFile2Repo : ${filePath}`);
    console.log('Error:', e.stack);
  }
}

function readFileContent() {

  try {
    var fileContent, obj;
    gitHubFileListStr = "";
    for(var i = 0;i<fileJson.length;i++){
      obj = fileJson[i];
      gitHubFileListStr += ` "${obj.github_path}",`
      file_path = obj.file_path;
      fileContent = fs.readFileSync(file_path, 'utf8');
      fileContent = fileContent.replace("{ORG_NAME}", process.env.GITHUB_ORGANIZATION);
      obj.file_content = fileContent;
      GLOBALS._debug == true ? console.log(GLOBALS.actionContent) : null;
    }
    gitHubFileListStr= gitHubFileListStr.slice(0,-1);
  } catch (e) {
    console.log('Error:', e.stack);
  }
}

async function getBranchList(repoName) {
  try {
    GLOBALS.repoBranch = await octokit.repos.listBranches({
      owner: process.env.GITHUB_ORGANIZATION,
      repo: repoName,
    });
    GLOBALS._debug == true ? console.log(GLOBALS.repoBranch) : null;
    GLOBALS._debug == true ? console.log(`${repoName} : listBranches: SUCCESSFULL`) : null;
  } catch (e) {
    console.log(`${repoName} : listBranches: FAILED`);
    console.log('Error:', e.stack);
  }
}

(async () => {

  repoJson = await csvtojsonV2().fromFile(repoListCsv);
  fileJson = await csvtojsonV2().fromFile(fileListCsv);
  console.log("Repository List:");
  console.log(repoJson);
  console.log("Files List:");
  console.log(fileJson);
  readFileContent();

  repoJson.forEach(
    async function (element) {
      await getBranchList(element.repo_name);
      branch_arr.forEach(elem => repoSetup(element.repo_name, elem));
    });

})();
