
require('dotenv').config();
const { Octokit } = require("@octokit/rest");
const csvtojsonV2 = require("csvtojson");
var fs = require('fs');

const csvFilePath = process.env.REPO_LIST_FILE;

console.log(process.env.GITHUB_BRANCH);
var branch_arr = JSON.parse(process.env.GITHUB_BRANCH);
//branch_arr = ["integration"];

var dateTime = new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString().split('.')[0];
var GLOBALS = {};
GLOBALS.debug = true;
GLOBALS.debug = false;
GLOBALS._delete = false;

if (process.env.GITHUB_BRANCH_PROTECTION_OVERRIDE == "true") {
  GLOBALS.branchProtectionOverride = true;
} else {
  GLOBALS.branchProtectionOverride = false;
}

console.log(process.env.GITHUB_TOKEN);

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function repoSetup(repoName, branchName) {

  var resp, branchProtectionData, default_branch, repoBranchData, sha, failureFlag;

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
  GLOBALS.debug == true ? console.log(default_branch) : null;

  var branchList = repoBranchData;
  var branch_data = branchList.filter(elem => elem.name == branchName)[0];
  var defaultBranch = branchList.filter(elem => elem.name == default_branch)[0];

  GLOBALS.debug == true ? console.log(branch_data) : null;
  GLOBALS.debug == true ? console.log(defaultBranch) : null;


  //console.log(defaultBranch);
  try {
    if (branch_data == undefined) {
      resp = await octokit.git.createRef({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        ref: "refs/heads/" + branchName,
        sha: defaultBranch.commit.sha,
      });
      GLOBALS.debug == true ? console.log(resp) : null;
      branch_data = {};
      branch_data.protected = false;
    }
    GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} createRef: SUCCESSFULL`) : null;
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
      GLOBALS.debug == true ? console.log(resp) : null;
      branchProtectionData = resp.data;
      GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} : getBranchProtection: SUCCESSFULL`) : null;
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
      GLOBALS.debug == true ? console.log(resp) : null;
      GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} : deleteBranchProtection: SUCCESSFULL`) : null;
    } catch (e) {
      failureFlag = true;
      console.log(`${repoName} : ${branchName} deleteBranchProtection: FAILED`);
      console.log('Error:', e.stack);
    }
  }

  if (branch_data.protected == false || (GLOBALS.branchProtectionOverride == true && branch_data.protected == true)) {

    try {
      resp = await octokit.repos.getContent({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        path: process.env.GITHUB_CONFIG_PATH,
        ref: branchName
      });
      sha = resp.data.sha;
      GLOBALS.debug == true ? console.log(resp) : null;
      GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} : getContent: File Exists : ${process.env.GITHUB_CONFIG_PATH}`) : null;
    } catch (e) {
      //failureFlag = true;
      sha = null;
      console.log(`${repoName} : ${branchName} : getContent: File Does Not Exist : ${process.env.GITHUB_CONFIG_PATH}`);
      //console.log('Error:', e.stack);
    }

    resp = await addDelFile2Repo(repoName, process.env.GITHUB_CONFIG_PATH, branchName, GLOBALS.prContent, sha);
    try {
      resp = await octokit.repos.getContent({
        owner: process.env.GITHUB_ORGANIZATION,
        repo: repoName,
        path: process.env.GITHUB_ACTION_PATH,
        ref: branchName
      });
      sha = resp.data.sha;
      GLOBALS.debug == true ? console.log(resp) : null;
      GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} : getContent: File Exists : ${process.env.GITHUB_ACTION_PATH}`) : null;
    } catch (e) {
      //failureFlag = true;
      sha = null;
      console.log(`${repoName} : ${branchName} : getContent: File Does Not Exist : ${process.env.GITHUB_ACTION_PATH}`);
      //console.log('Error:', e.stack);
    }

    resp = await addDelFile2Repo(repoName, process.env.GITHUB_ACTION_PATH, branchName, GLOBALS.actionContent, sha);

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
      GLOBALS.debug == true ? console.log(resp) : null;
      GLOBALS.debug == true ? console.log(`\n updateBranchProtection: successfull : repoName : ${repoName} : branchName : ${branchName}`) : null;
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
    console.log(`${repoName} : ${branchName} : END : CHECK : Check Repository's - Action file "${process.env.GITHUB_ACTION_PATH}", Config file "${process.env.GITHUB_CONFIG_PATH}", and Branch Protection`);
  } else {
    if(GLOBALS._delete == true){
    console.log(`${repoName} : ${branchName} : END : SUCCESSFULL - Deleted Repository's - Action file "${process.env.GITHUB_ACTION_PATH}" and Config file "${process.env.GITHUB_CONFIG_PATH}`);
    }else{
      console.log(`${repoName} : ${branchName} : END : SUCCESSFULL - Added Repository's - Action file "${process.env.GITHUB_ACTION_PATH}" and Config file "${process.env.GITHUB_CONFIG_PATH}`);
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
      GLOBALS.debug == true ? console.log(resp) : null;
      GLOBALS.debug == true ? console.log(`${repoName} : ${branchName} : createOrUpdateFileContents: SUCCESSFULL`) : null;
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
    GLOBALS.actionContent = fs.readFileSync(process.env.ACTION_PATH, 'utf8');
    GLOBALS.actionContent = GLOBALS.actionContent.replace("{ORG_NAME}", process.env.GITHUB_ORGANIZATION);
    GLOBALS.debug == true ? console.log(GLOBALS.actionContent) : null;

    GLOBALS.prContent = fs.readFileSync(process.env.CONFIG_PATH, 'utf8');
    GLOBALS.debug == true ? console.log(GLOBALS.prContent) : null;

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
    GLOBALS.debug == true ? console.log(GLOBALS.repoBranch) : null;
    GLOBALS.debug == true ? console.log(`${repoName} : listBranches: SUCCESSFULL`) : null;
  } catch (e) {
    console.log(`${repoName} : listBranches: FAILED`);
    console.log('Error:', e.stack);
  }
}

(async () => {

  const jsonArray = await csvtojsonV2().fromFile(csvFilePath);

  console.log(jsonArray);

  readFileContent();

  jsonArray.forEach(
    async function (element) {
      await getBranchList(element.repo_name);
      branch_arr.forEach(elem => repoSetup(element.repo_name, elem));
    });

})();
