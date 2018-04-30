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

// function createNewRepo(token) {
//     $.ajax({
//         type: 'POST',
//         url: 'https://api.github.com/user/repos',
//         headers: {
//             'Authorization': `token ${token}`
//         },
//         data: JSON.stringify({
//             name: "bookmarks",
//             auto_init: true
//         }),
//         dataType: 'json',
//         success: function (data) {
//             console.log(JSON.stringify(data));
//         }, error: function (xhr, textStatus, errorThrown) {
//             console.log(JSON.stringify(xhr));
//             console.log(JSON.stringify(textStatus));
//             console.log(JSON.stringify(errorThrown));
//         }
//     });
// }

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
 * This function upload the blob to branch
 * @param token - The github token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param key - The AES key
 * @param blob - The raw section of bookmark object, can be a folder or a bookmark (from the browser API)
 * @param successCallback
 * @param errorCallback
 */
function uploadBlob(token, username, repo_name, key, blob, successCallback, errorCallback) {
    let b64_enc_blob = btoa(CryptoJS.AES.encrypt(JSON.stringify(blob), key).toString());

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
 * This function create a new tree and link the blob to it
 * @param token - The github token
 * @param username - The git user
 * @param repoName - The git repo name
 * @param treeSha - The sha of the latest tree
 * @param uploadedBlobs - The blobs saved to github
 * @param successCallback
 * @param errorCallback
 */
function createTreeForBlob(token, username, repoName, treeSha, uploadedBlobs, successCallback, errorCallback) {
    var treeBlobs = [];

    uploadedBlobs.forEach(function (blob) {
        let blobSha = blob.sha;
        treeBlobs.push({
            path: `${blobSha}.data`,
            mode: "100644",
            type: "blob",
            sha: blobSha
        });
    });

    let treeData = JSON.stringify({
        base_tree: treeSha,
        tree: treeBlobs
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
 * Update the selected tree reference
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
        browser.storage.local.set({
            github: {
                token: $('#inputGithubToken').val(),
                key: $('#inputAesKey').val(),
            }
        });
    });

    $("#btnCallGithubSync").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;
            var key = github.key;
            var token = github.token;
            let username = "doi9t";
            let repoName = "bookmarks";

            if (token && key) {
                showSyncSpinner(true);
                browser.bookmarks.getTree(function (bookmarkTreeNodes) {
                    let bookmarks = [];
                    fillBookmarkList(bookmarkTreeNodes[0], bookmarks);

                    //Get the tree ref
                    getRef(token, username, repoName, function getRefSuccessCallback(refData) {
                        var treeSha = refData["object"]["sha"];
                        console.log(`The tree sha is ${treeSha}`);

                        getCommitSha(token, username, repoName, treeSha, function getRefSuccessCallback(commitData) {
                            var uploadedBlobs = [];
                            var commitSha = commitData.sha;
                            console.log(`Sha of the commit ${commitSha}`);

                            uploadBlob(token, username, repoName, key, bookmarks, function (blobData) {
                                console.log(`The blob is uploaded (sha -> ${blobData.sha}) !`);
                                uploadedBlobs.push(blobData);
                            }, apiError);

                            //Create a tree for the uploaded blobs
                            createTreeForBlob(token, username, repoName, treeSha, uploadedBlobs, function (treeData) {
                                let newTreeSha = treeData.sha;

                                console.log(`The tree for the "${newTreeSha}" file has been created (url -> ${treeData.url}) !`);

                                //Commit
                                commit(token, username, repoName, newTreeSha, commitSha, function (commitData) {
                                    let commitSha = commitData.sha;
                                    console.log(`The commit sha for the tree "${newTreeSha}" is "${commitSha}"`);

                                    updateReference(token, username, repoName, treeSha, commitSha, function (referenceData) {
                                        console.log(`The reference sha "${referenceData["object"].sha}"`);
                                        showSyncSpinner(false);
                                    }, apiError);
                                }, apiError);
                            }, apiError);
                        }, apiError);
                    }, apiError);
                });
            } else {
                alert("The github token or the key is undefined!");
            }
        });
    });
}

function setComponentsDefaultValues() {
    browser.storage.local.get("github", function (item) {
        let github = item.github;

        $('#inputGithubToken').val(github.token);
        $('#inputAesKey').val(github.key);
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
