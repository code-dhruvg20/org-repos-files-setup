# @github/org-setup

## Description

## Usage

Copy the `.env.example` to `.env` and fill in the vaules for

- `GITHUB_TOKEN`: A GitHub Personal Access token with Full Private `repo` scope
- `GITHUB_ORGANIZATION`: The name of the organization you want to read the data for.
- `REPO_LIST_FILE`: repo_list.csv
- `GITHUB_ACTION_PATH`: .github/workflows/pr-process.yml
- `ACTION_PATH`: ./data/pr-process.yml
- `GITHUB_CONFIG_PATH`:.github/pr_config.yml
- `CONFIG_PATH`: ./data/pr_config.yml
- `GITHUB_BRANCH`: ["master", "integration"]
- `GITHUB_BRANCH_PROTECTION_OVERRIDE`: true

Generated `*.csv` files will be stored under `./data`.

### Run it locally

Run the below commands from within this folder.

```sh
npm install

npm start
```

### Run it with :whale: Docker

Run the below commands from within this folder.

```sh
docker build \
  --no-cache=true \
  -t github/get-repos-in-org-and-size .

docker run \
  -v "$(pwd)/data":/get-repos-in-org-and-size/data \
  -it github/get-repos-in-org-and-size
```

If you want, you can provide the variables (e.g. `GITHUB_ORGANIZATION`) also at runtime:

Example:

```sh
docker run \
  -e GITHUB_TOKEN=my-token \
  -e GITHUB_ORGANIZATION=my-org \
  -v "$(pwd)/data":/get-repos-in-org-and-size/data \
  -it github/get-repos-in-org-and-size
```

## Run it with :whale: Docker against github.com from [GPR](https://github.com/github/services-toolbox/packages/10802)

```sh
docker run \
  -e GITHUB_TOKEN=my-token \
  -e GITHUB_ORGANIZATION=my-org \
  -v "$(pwd)/data":/get-repos-in-org-and-size/data \
  -it docker.pkg.github.com/github/services-toolbox/get-repos-in-org-and-size:1.0.2
```

## Run it with :whale: Docker against GitHub Enterprise Server (e.g. github.example.com) from [GPR](https://github.com/github/services-toolbox/packages/10802)

```sh
docker run \
  -e GITHUB_API_URL=https://github.example.com/api/graphql \
  -e GITHUB_TOKEN=my-token \
  -e GITHUB_ORGANIZATION=my-org \
  -v "$(pwd)/data":/get-repos-in-org-and-size/data \
  -it docker.pkg.github.com/github/services-toolbox/get-repos-in-org-and-size:1.0.2
```

### octokit.github.io API Calls in the Code

- octokit.repos.get
- octokit.git.createRef
- octokit.repos.getBranchProtection
- octokit.repos.deleteBranchProtection
- octokit.repos.getContent
- octokit.repos.updateBranchProtection
- octokit.repos.createOrUpdateFileContents
- octokit.repos.listBranches
- octokit.repos.deleteFile

