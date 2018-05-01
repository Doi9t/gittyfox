/*
 *    Copyright 2014 - 2018 Yannick Watier
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

/**
 * Create a new repo for the user
 * @param token
 * @param repo_name - The git repo name
 * @param successCallback
 * @param errorCallback
 */
function createNewRepo(token, repo_name, successCallback, errorCallback) {
    $.ajax({
        type: 'POST',
        url: 'https://api.github.com/user/repos',
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            name: "bookmarks",
            auto_init: true
        }),
        dataType: 'json',
        async: false,
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}

/**
 * Get the ref of the master branch
 * @param token - The github token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param successCallback
 * @param errorCallback
 */
function getRef(token, username, repo_name, successCallback, errorCallback) {
    $.ajax({
        type: 'GET',
        url: `https://api.github.com/repos/${username}/${repo_name}/git/refs/heads/master`,
        headers: {
            'Authorization': `token ${token}`
        },
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}


/**
 * Get the current user based on the token (synchronous method)
 * @param token
 * @param successCallback
 * @param errorCallback
 */
function getUsername(token, successCallback, errorCallback) {
    $.ajax({
        type: 'GET',
        url: "https://api.github.com/user",
        headers: {
            'Authorization': `token ${token}`
        },
        dataType: 'json',
        async: false,
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}


/**
 * Get the current user based on the token (synchronous method)
 * @param token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param successCallback
 */
function checkIfRepoExist(token, username, repo_name, successCallback) {
    $.ajax({
        type: 'GET',
        url: `https://api.github.com/repos/${username}/${repo_name}`,
        headers: {
            'Authorization': `token ${token}`
        },
        dataType: 'json',
        async: false,
        success: function (data) {
            successCallback(true);
        }, error: function (xhr, ajaxOptions, thrownError) {
            successCallback(false); //"status":404,"statusText":"Not Found"
        }
    });
}


/**
 * Get the latest commit sha from the branch
 * @param token - The github token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param tree_sha - The sha of the tree
 * @param successCallback
 * @param errorCallback
 */
function getCommitSha(token, username, repo_name, tree_sha, successCallback, errorCallback) {
    $.ajax({
        type: 'GET',
        url: `https://api.github.com/repos/${username}/${repo_name}/git/commits/${tree_sha}`,
        headers: {
            'Authorization': `token ${token}`
        },
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}

/**
 * This function upload the blob to branch (synchronous method)
 * @param token - The github token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param key - The AES key
 * @param blob - The raw section of bookmark object, can be a folder or a bookmark (from the browser API)
 * @param successCallback
 * @param errorCallback
 */
function uploadBlob(token, username, repo_name, key, blob, successCallback, errorCallback) {
    let b64_enc_blob = btoa(CryptoJS.AES.encrypt(blob, key).toString());

    $.ajax({
        type: 'POST',
        url: `https://api.github.com/repos/${username}/${repo_name}/git/blobs`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            content: b64_enc_blob,
            encoding: "base64"
        }),
        async: false,
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}

function commit(token, username, repo_name, newTreeSha, commitSha, successCallback, errorCallback) {
    var parents = [];
    parents.push(commitSha);

    $.ajax({
        type: 'POST',
        url: `https://api.github.com/repos/${username}/${repo_name}/git/commits`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            message: "bookmarks updated",
            parents: parents,
            tree: newTreeSha
        }),
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}


/**
 * This function create a new tree and link the blob to it (synchronous method)
 * @param token - The github token
 * @param username - The git user
 * @param repoName - The git repo name
 * @param treeSha - The sha of the latest tree
 * @param bookmarkAsBlob - The blob saved to github
 * @param successCallback
 * @param errorCallback
 */
function createTreeForBlob(token, username, repoName, treeSha, bookmarkAsBlob, successCallback, errorCallback) {
    let treeData = JSON.stringify({
        base_tree: treeSha,
        tree: [{
            path: "bookmark.enc",
            mode: "100644",
            type: "blob",
            sha: bookmarkAsBlob.sha
        }]
    });

    $.ajax({
        type: 'POST',
        url: `https://api.github.com/repos/${username}/${repoName}/git/trees`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: treeData,
        async: false,
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}

/**
 * Update the selected tree reference (synchronous method)
 * @param token - The github token
 * @param username - The git user
 * @param repoName - The git repo name
 * @param treeSha - The sha of the tree
 * @param commitSha - The commit sha
 * @param successCallback
 * @param errorCallback
 */
function updateReference(token, username, repoName, treeSha, commitSha, successCallback, errorCallback) {
    $.ajax({
        type: 'PATCH',
        url: `https://api.github.com/repos/${username}/${repoName}/git/refs/heads/master`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            sha: commitSha,
            force: false
        }),
        async: false,
        dataType: 'json',
        success: function (data) {
            successCallback(data);
        }, error: function (xhr, ajaxOptions, thrownError) {
            errorCallback(xhr, ajaxOptions, thrownError);
        }
    });
}

function showSyncSpinner(show) {
    $("#imgLoading").toggle(show);
}

function setActionTriggers() {
    disableUiAction(false);

    $("#btnGithubSave").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;

            if (!github) {
                github = {};
            }

            github.token = $('#inputGithubToken').val();
            github.key = $('#inputAesKey').val();
            github.repo = $('#inputRepoName').val();

            browser.storage.local.set({
                github: github
            });
        });
    });


    $("#btnCallGithubSync").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;
            var key = github.key;
            var token = github.token;
            var repoName = github.repo;
            var username = github.user;
            var savedRev = github.rev;
            var isRepoPresent = false;

            console.log(`Last saved tree rev -> ${savedRev}`);

            if (token && key && repoName) {
                if (!username) {
                    getUsername(token, function getUsernameSuccessCallback(userData) {
                        //Save the username
                        username = userData.login;
                        github.user = username;
                        browser.storage.local.set({
                            github: github
                        });

                        console.log("found username -> " + username);
                    }, apiError);
                }

                if (!username) {
                    return;
                }

                checkIfRepoExist(token, username, repoName, function (isRepoPresentData) {
                    if (!isRepoPresentData) { //Create the repo
                        console.log("The repo is NOT present!");
                        console.log("Creating the repo!");

                        createNewRepo(token, repoName, function (repoData) {
                            console.log(`The repo is created (id -> ${repoData.id})!`);
                            isRepoPresent = true;
                        }, apiError);
                    } else {
                        console.log("The repo is present!");
                        isRepoPresent = true;
                    }
                });

                if (!isRepoPresent) {
                    console.log("The repo is NOT present, quitting!");
                    return;
                }

                showSyncSpinner(true);
                browser.bookmarks.getTree(function (bookmarkTreeNodes) {
                    let bookmarksAsList = [];
                    fillBookmarkList(bookmarkTreeNodes[0], bookmarksAsList);
                    let bookmarks = JSON.stringify(bookmarksAsList);

                    //Get the tree ref
                    getRef(token, username, repoName, function getRefSuccessCallback(refData) {
                        var treeSha = refData["object"]["sha"];
                        console.log(`The tree sha is ${treeSha}`);

                        getCommitSha(token, username, repoName, treeSha, function getRefSuccessCallback(commitData) {
                            var bookmarkAsBlob = null;
                            var commitSha = commitData.sha;
                            console.log(`Sha of the commit ${commitSha}`);

                            uploadBlob(token, username, repoName, key, bookmarks, function (blobData) {
                                console.log(`The blob is uploaded (sha -> ${blobData.sha}) !`);
                                bookmarkAsBlob = blobData;
                            }, apiError);

                            if (bookmarkAsBlob == null) {
                                apiError("bookmarkAsBlob is null");
                                return;
                            }

                            //Create a tree for the uploaded blobs
                            createTreeForBlob(token, username, repoName, treeSha, bookmarkAsBlob, function (treeData) {
                                let newTreeSha = treeData.sha;

                                console.log(`The tree for the "${newTreeSha}" file has been created (url -> ${treeData.url}) !`);

                                //Commit
                                commit(token, username, repoName, newTreeSha, commitSha, function (commitData) {
                                    let commitSha = commitData.sha;
                                    console.log(`The commit sha for the tree "${newTreeSha}" is "${commitSha}"`);

                                    updateReference(token, username, repoName, treeSha, commitSha, function (referenceData) {
                                        console.log(`The reference sha "${referenceData["object"].sha}"`);
                                        showSyncSpinner(false);

                                        //Save the latest revision
                                        github.rev = commitSha;
                                        browser.storage.local.set({
                                            github: github
                                        });
                                    }, apiError);
                                }, apiError);
                            }, apiError);
                        }, apiError);
                    }, apiError);
                });
            } else {
                alert("The github token, key or the repo is undefined!");
            }
        });
    });
}

function setComponentsDefaultValues() {
    browser.storage.local.get("github", function (item) {
        let github = item.github;

        if (github) {
            $('#inputGithubToken').val(github.token);
            $('#inputAesKey').val(github.key);
            $('#inputRepoName').val(github.repo);
        }
    });
}

function showMainView() {
    setComponentsDefaultValues();
    setActionTriggers();
}

function apiError(xhr, ajaxOptions, thrownError) {
    console.log(`There was an error while fetching the API -> (thrownError -> ${thrownError}, ajaxOptions -> ${JSON.stringify(ajaxOptions)}, xhr -> ${JSON.stringify(xhr)}`)
    showSyncSpinner(false);
}


function disableUiAction(value) {
    let $btnCallGithubSync = $("#btnCallGithubSync");
    let $btnGithubSave = $("#btnGithubSave");

    $btnCallGithubSync.prop("disabled", value);
    $btnGithubSave.prop("disabled", value);

    if (value) {
        $btnCallGithubSync.addClass("disabled");
        $btnGithubSave.addClass("disabled");
    } else {
        $btnCallGithubSync.removeClass("disabled");
        $btnGithubSave.removeClass("disabled");
    }
}

/**
 * This function fill the bookmarks list with the groups of bookmarks
 * @param bookmarkItem - The root of the bookmarks (from the browser API)
 * @param bookmarks - The list to be filled
 */
function fillBookmarkList(bookmarkItem, bookmarks) {
    bookmarks.push(bookmarkItem);

    if (bookmarkItem.children) {
        for (child of bookmarkItem.children) {
            fillBookmarkList(child, bookmarks);
        }
    }
}

function reportExecuteScriptError(error) {
    console.error(`Failed to execute content script: ${error.message}`);
    disableUiAction(true);
}

browser.tabs.executeScript({code: ""}).then(showMainView).catch(reportExecuteScriptError);
