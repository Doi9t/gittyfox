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


//TODO: Uses LZMA-JS -> https://www.npmjs.com/package/lzma
//TODO: Add an option to delete all browser's bookmarks & sync with server

const BASE_API_URL = "https://api.github.com";
const BOOKMARK_FILE_NAME = "bookmark.enc";

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
        url: `${BASE_API_URL}/user/repos`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            name: repo_name,
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
        url: `${BASE_API_URL}/repos/${username}/${repo_name}/git/refs/heads/master`,
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
 * Get a tree based on a sha
 * @param token
 * @param username
 * @param repo_name
 * @param commit_sha
 * @param successCallback
 * @param errorCallback
 */
function getTree(token, username, repo_name, commit_sha, successCallback, errorCallback) {
    $.ajax({
        type: 'GET',
        url: `${BASE_API_URL}/repos/${username}/${repo_name}/git/trees/${commit_sha}`,
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
        url: `${BASE_API_URL}/user`,
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
        url: `${BASE_API_URL}/repos/${username}/${repo_name}`,
        headers: {
            'Authorization': `token ${token}`
        },
        dataType: 'json',
        async: false,
        success: function () {
            successCallback(true);
        }, error: function () {
            successCallback(false); //"status":404,"statusText":"Not Found"
        }
    });
}

/**
 * This function upload the blob to branch (synchronous method)
 * @param token - The github token
 * @param username - The git user
 * @param repo_name - The git repo name
 * @param key - The AES key
 * @param config - The CryptoJS config for the AES
 * @param blob - The raw section of bookmark object, can be a folder or a bookmark (from the browser API)
 * @param successCallback
 * @param errorCallback
 */
function uploadBlob(token, username, repo_name, key, config, blob, successCallback, errorCallback) {
    let enc_blob = CryptoJS.AES.encrypt(blob, key, config).toString();

    $.ajax({
        type: 'POST',
        url: `${BASE_API_URL}/repos/${username}/${repo_name}/git/blobs`,
        headers: {
            'Authorization': `token ${token}`
        },
        data: JSON.stringify({
            content: enc_blob,
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

/**
 * Commit the current tree
 * @param token
 * @param username
 * @param repo_name
 * @param newTreeSha
 * @param headCommitSha
 * @param successCallback
 * @param errorCallback
 */
function commit(token, username, repo_name, newTreeSha, headCommitSha, successCallback, errorCallback) {
    var parents = [];
    parents.push(headCommitSha);

    $.ajax({
        type: 'POST',
        url: `${BASE_API_URL}/repos/${username}/${repo_name}/git/commits`,
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
 * @param headCommitSha - The sha of the latest tree
 * @param bookmarkAsBlob - The blob saved to github
 * @param successCallback
 * @param errorCallback
 */
function createTreeForBlob(token, username, repoName, headCommitSha, bookmarkAsBlob, successCallback, errorCallback) {
    let treeData = JSON.stringify({
        base_tree: headCommitSha,
        tree: [{
            path: BOOKMARK_FILE_NAME,
            mode: "100644",
            type: "blob",
            sha: bookmarkAsBlob.sha
        }]
    });

    $.ajax({
        type: 'POST',
        url: `${BASE_API_URL}/repos/${username}/${repoName}/git/trees`,
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
 * @param headCommitSha - The sha of the tree
 * @param commitSha - The commit sha
 * @param successCallback
 * @param errorCallback
 */
function updateReference(token, username, repoName, headCommitSha, commitSha, successCallback, errorCallback) {
    $.ajax({
        type: 'PATCH',
        url: `${BASE_API_URL}/repos/${username}/${repoName}/git/refs/heads/master`,
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

function mergeServerBookmarksWithCurrent(token, username, repoName, headCommitSha, key, config) {
    getTree(token, username, repoName, headCommitSha, function (treeData) {

        //Find the blob of the bookmark
        for (blob of treeData.tree) {
            //The blob if found
            if (BOOKMARK_FILE_NAME === blob.path) {
                let blobUrl = blob.url;
                console.log(`Fetching the blob at ${blobUrl}`);

                //Fetch the blob data (synchronous)
                $.ajax({
                    type: 'GET',
                    url: blobUrl,
                    headers: {
                        'Authorization': `token ${token}`
                    },
                    dataType: 'json',
                    success: function (data) {
                        var bookmarks =
                            JSON.parse(CryptoJS.AES.decrypt(data.content.replace(/\n/g, ''), key, config).toString(CryptoJS.enc.Utf8));

                        for (bookmarksRoot of bookmarks) {

                            var currentChildren =  bookmarksRoot.children;

                            currentChildren.sort(function(a, b){
                                return a.index < b.index;
                            });

                            for (bookmarksRootItem of currentChildren) {
                                mergeBookmarks(bookmarksRootItem, null);
                            }
                        }
                    }, error: apiError
                });
                break;
            }
        }
    }, apiError);
}


function bookmarkError(error) {
    console.log(`There's an error while searching the bookmark: ${error}`);
}

function createBookmark(bookmarkItem, lastCreatedBookmarkId, callback) {

    let newBookmark = {
        index: bookmarkItem.index,
        parentId: (lastCreatedBookmarkId !== null) ? lastCreatedBookmarkId : bookmarkItem.parentId,
        title: bookmarkItem.title,
        url: bookmarkItem.url
    };

    browser.bookmarks.create(newBookmark).then(function (bookmark) {
        callback(bookmark);
    });
}

function mergeBookmarks(remoteBookmarkItem, lastCreatedBookmarkId) {
    var searching;
    var remoteBookmarkTitle = remoteBookmarkItem.title;
    var remoteBookmarkUrl = remoteBookmarkItem.url;
    var remoteBookmarkId = remoteBookmarkItem.id;

    if (remoteBookmarkUrl) { //Bookmark
        searching = browser.bookmarks.search({url: remoteBookmarkUrl, title: remoteBookmarkTitle});
    } else { //Folder
        searching = browser.bookmarks.search({title: remoteBookmarkTitle});
    }

    //Search the local bookmarks
    searching.then(function (localBookmarkItems) {
        var createNewBookmark = false;

        if (localBookmarkItems.length) { //The bookmark(s) exist in the current browser
            for (localBookmark of localBookmarkItems) {
                if (localBookmark.id === remoteBookmarkId) {
                    createNewBookmark = true;
                    break;
                }
            }
        } else {
            createNewBookmark = true;
        }

        if (createNewBookmark) { //The bookmark(s) does not exist in the current browser, create it
            createBookmark(remoteBookmarkItem, lastCreatedBookmarkId, function (bookmark) {

                var currentChildren =  remoteBookmarkItem.children;

                currentChildren.sort(function(a, b){
                    return a.index < b.index;
                });

                for (child of remoteBookmarkItem.children) {
                    mergeBookmarks(child, bookmark.id);
                }
            });
        }
    }, bookmarkError);
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
            github.repo = $('#inputRepoName').val();
            github.security = JSON.parse(atob($('#inputAesSecurity').val()));
            browser.storage.local.set({
                github: github
            });
        });
    });


    $("#btnCallGithubSync").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;
            var key = github.security.key;
            var token = github.token;
            var repoName = github.repo;
            var username = github.user;
            var savedRef = github.ref;
            var isRepoPresent = false;
            var config = {iv: github.security.iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};

            console.log(`Last saved commit sha -> ${savedRef}`);

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
                    showSyncSpinner(false);
                    console.log("The username is NOT present, quitting!");
                    return;
                }

                checkIfRepoExist(token, username, repoName, function (isRepoPresentData) {
                    if (!isRepoPresentData) { //Create the repo
                        console.log("The repo is NOT present!");
                        console.log(`Creating the repo ${repoName}!`);

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
                    showSyncSpinner(false);
                    console.log("The repo is NOT present, quitting!");
                    return;
                }

                showSyncSpinner(true);
                browser.bookmarks.getTree(function (bookmarkTreeNodes) {
                    let bookmarksRootAsList = [];

                    //Keep the roots (Bookmarks Menu | Bookmarks Toolbar | Other Bookmarks | Mobile Bookmarks)
                    for (child of bookmarkTreeNodes[0].children) {
                        bookmarksRootAsList.push(child);
                    }

                    //Get the tree ref
                    getRef(token, username, repoName, function getRefSuccessCallback(refData) {
                        var headCommitSha = refData["object"]["sha"];
                        console.log(`The latest commit sha is ${headCommitSha}`);

                        if (savedRef !== headCommitSha) { //The current bookmarks are desynced, merge before committing!
                            mergeServerBookmarksWithCurrent(token, username, repoName, headCommitSha, key, config);
                        }

                        var bookmarkAsBlob = null;

                        uploadBlob(token, username, repoName, key, config, JSON.stringify(bookmarksRootAsList), function (blobData) {
                            console.log(`The blob is uploaded (sha -> ${blobData.sha}) !`);
                            bookmarkAsBlob = blobData;
                        }, apiError);

                        if (bookmarkAsBlob == null) {
                            apiError("bookmarkAsBlob is null");
                            return;
                        }

                        //Create a tree for the uploaded blobs
                        createTreeForBlob(token, username, repoName, headCommitSha, bookmarkAsBlob, function (treeData) {
                            let newTreeSha = treeData.sha;

                            console.log(`The tree for the "${newTreeSha}" file has been created (url -> ${treeData.url}) !`);

                            //Commit
                            commit(token, username, repoName, newTreeSha, headCommitSha, function (commitData) {
                                let commitSha = commitData.sha;
                                console.log(`The commit sha for the tree "${newTreeSha}" is "${commitSha}"`);

                                updateReference(token, username, repoName, headCommitSha, commitSha, function (referenceData) {
                                    console.log(`The reference sha "${referenceData["object"].sha}"`);
                                    showSyncSpinner(false);

                                    //Save the latest revision
                                    github.ref = commitSha;
                                    browser.storage.local.set({
                                        github: github
                                    });
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
        var github = item.github;

        if (github) {
            $('#inputGithubToken').val(github.token);
            $('#inputRepoName').val(github.repo);
            $("#inputAesSecurity").val(btoa(JSON.stringify(github.security)));
        } else {
            github = {
                security: {
                    key: CryptoJS.lib.WordArray.random(64).toString(),
                    iv: CryptoJS.lib.WordArray.random(16).toString()
                }
            };
            browser.storage.local.set({
                github: github
            });

            $("#inputAesSecurity").val(btoa(JSON.stringify(github.security)));
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

function reportExecuteScriptError(error) {
    console.error(`Failed to execute content script: ${error.message}`);
    disableUiAction(true);
}


function bookmarkEvent() {

}

browser.tabs.executeScript({code: ""}).then(showMainView).catch(reportExecuteScriptError);
browser.bookmarks.onCreated.addListener(bookmarkEvent);
browser.bookmarks.onRemoved.addListener(bookmarkEvent);
