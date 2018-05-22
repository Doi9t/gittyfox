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

const BASE_API_URL = "https://api.github.com";
const BOOKMARK_FILE_NAME = "bookmark.enc";
const OVERRIDE_LOCAL_WITH_SERVER = "OVERRIDE_LOCAL_WITH_SERVER";
const OVERRIDE_SERVER_WITH_LOCAL = "OVERRIDE_SERVER_WITH_LOCAL";
const BOOKMARK_ROOT_MENU = "menu________";
const BOOKMARK_ROOT_TOOLBAR = "toolbar_____";
const BOOKMARK_ROOT_UNFILED = "unfiled_____";
const BOOKMARK_ROOT_MOBILE = "mobile______";

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
 * @return Promise<any> promise
 */
function getUsername(token) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            type: 'GET',
            url: `${BASE_API_URL}/user`,
            headers: {
                'Authorization': `token ${token}`
            },
            dataType: 'json',
            async: false
        }).done(function (data) {
            resolve(data);
        }).fail(function (xhr, ajaxOptions, thrownError) {
            var error = "undefined";
            var json = JSON.parse(xhr.responseText);

            if (xhr.status === 401 && json.message === "Bad credentials") {
                error = "bad_creds";
            }

            reject(error);
        });
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

    console.log("Size of blob before compression -> " + blob.length);
    var enc_blob = LZString.compressToUTF16(blob);
    console.log("Size of blob after compression -> " + enc_blob.length);
    enc_blob = CryptoJS.AES.encrypt(enc_blob, key, config).toString();
    console.log("Size of blob after encryption -> " + enc_blob.length);
    enc_blob = LZString.compressToBase64(enc_blob);
    console.log("Size of blob after compression -> " + enc_blob.length);

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


function deleteAllLocalBookmarks() {
    for (var currentTreeName of [BOOKMARK_ROOT_MENU, BOOKMARK_ROOT_TOOLBAR, BOOKMARK_ROOT_UNFILED, BOOKMARK_ROOT_MOBILE]) {
        browser.bookmarks.getSubTree(currentTreeName).then(function (treeArr) {
            var tree = treeArr[0];
            for (var children of tree.children) {
                var id = children.id;

                if (children.url) {
                    browser.bookmarks.remove(id);
                } else {
                    browser.bookmarks.removeTree(id);
                }
            }
        });
    }
}

async function createNewBookmark(currentElement, parentId) {
    var bookmark = await browser.bookmarks.create({
        index: currentElement.index,
        parentId: (parentId !== null ? parentId : currentElement.parentId),
        title: currentElement.title,
        url: currentElement.url
    });

    var children = currentElement.children;

    if (children) {
        for (var bookmarksItem of children) {
            await createNewBookmark(bookmarksItem, bookmark.id);
        }
    }
}

function fetchBlobFromCommit(token, username, repoName, headCommitSha, key, config, callback) {
    getTree(token, username, repoName, headCommitSha, function (treeData) {
        //Find the blob of the bookmark
        for (var blob of treeData.tree) {
            //The blob if found
            if (BOOKMARK_FILE_NAME === blob.path) {
                let blobUrl = blob.url;
                console.log(`Fetching the blob at ${blobUrl}`);

                //Fetch the blob data
                $.ajax({
                    type: 'GET',
                    url: blobUrl,
                    headers: {
                        'Authorization': `token ${token}`
                    },
                    dataType: 'json',
                    success: function (data) {
                        var bookmarks =
                            JSON.parse(LZString.decompressFromUTF16(CryptoJS.AES.decrypt(LZString.decompressFromBase64(data.content.replace(/\n/g, '')), key, config).toString(CryptoJS.enc.Utf8)));

                        callback(bookmarks);
                    }, error: apiError
                });
                break;
            }
        }
    }, apiError);
}

function overrideLocalByRemote(token, username, repoName, headCommitSha, key, config) {
    fetchBlobFromCommit(token, username, repoName, headCommitSha, key, config, async function (bookmarks) {
        disableUiAction(true);
        disableBookmarkListeners();
        deleteAllLocalBookmarks();
        for (var bookmarksRoot of bookmarks) {
            for (var rootChild of bookmarksRoot.children) {
                await createNewBookmark(rootChild, bookmarksRoot.id);
            }
        }
        enableBookmarkListeners();
        disableUiAction(false);
        alertify.notify('The bookmarks have been replaced with those of the server successfully!', 'success', 5);
    });
}

function getLocalBookmarkRootsFromTree(bookmarkTreeNodes) {
    let bookmarksRootAsList = [];

    //Keep the roots (Bookmarks Menu | Bookmarks Toolbar | Other Bookmarks | Mobile Bookmarks)
    for (var child of bookmarkTreeNodes[0].children) {
        bookmarksRootAsList.push(child);
    }

    return bookmarksRootAsList;
}

function overrideServerWithLocal(token, username, repoName, headCommitSha, key, config) {
    browser.bookmarks.getTree(function (bookmarkTreeNodes) {
        let bookmarksRootAsList = getLocalBookmarkRootsFromTree(bookmarkTreeNodes);

        var bookmarkAsBlob = null;

        uploadBlob(token, username, repoName, key, config, JSON.stringify(bookmarksRootAsList), function (blobData) {
            console.log(`The blob is uploaded (sha -> ${blobData.sha}) !`);
            bookmarkAsBlob = blobData;
        }, apiError);

        if (bookmarkAsBlob == null) {
            throw "bookmarkAsBlob is null";
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
                    alertify.notify('The bookmarks on the server are successfully changed!', 'success', 5);
                }, apiError);
            }, apiError);
        }, apiError);
    });
}

function executeBookmarkAction(action) {
    browser.storage.local.get("github", function (item) {
        let github = item.github;
        var key = github.security.key;
        var token = github.token;
        var repoName = github.repo;
        var username = github.user;
        var isRepoPresent = false;
        var config = {iv: github.security.iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};

        if (token && key && repoName) {
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
                throw "The repo is NOT present, quitting!";
            }

            showSyncSpinner(true);

            //Get the tree ref
            getRef(token, username, repoName, function getRefSuccessCallback(refData) {
                var headCommitSha = refData["object"]["sha"];
                console.log(`The latest commit sha is ${headCommitSha}`);

                switch (action) {
                    case OVERRIDE_LOCAL_WITH_SERVER:
                        overrideLocalByRemote(token, username, repoName, headCommitSha, key, config);
                        break;
                    case OVERRIDE_SERVER_WITH_LOCAL:
                        overrideServerWithLocal(token, username, repoName, headCommitSha, key, config);
                        break;
                    default:
                        throw "unknown action!";
                }

                showSyncSpinner(false);
            }, apiError);
        } else {
            alertify.notify('The github token, key or the repo is undefined!', 'warning', 5);
        }
    });
}

function setActionTriggers() {
    $("#btnGithubSave").click(function () {
        browser.storage.local.get("github", function (item) {
            var token = $('#inputGithubToken').val();

            getUsername(token).then(function (userData) {
                let github = item.github;

                if (!github) {
                    github = {};
                }
                var username = userData.login;

                github.token = token;
                github.repo = $('#inputRepoName').val();
                github.security = JSON.parse(atob($('#inputAesSecurity').val()));
                github.user = username;

                browser.storage.local.set({
                    github: github
                }).then(function () {
                    alertify.notify('Saved successfully!', 'success', 5);
                });

                console.log("found username -> " + username);
            }).catch(function (type) {
                var reason;

                switch (type) {
                    case "bad_creds":
                        reason = "The github token is not valid or expired!";
                        break;
                    default:
                        reason = "undefined";
                        break;
                }

                alertify.error(reason, 5);
            });
        });
    });

    $("#historyFindBtn").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;
            var key = github.security.key;
            var token = github.token;
            var repoName = github.repo;
            var username = github.user;
            var startDate = $('#historyDateStart').val();
            var endDate = $('#historyDateEnd').val();
            var $historySelect = $('#historySelect');

            if (!startDate || !endDate) {
                alertify.notify('Specify the start and the end date!', 'error', 5);
                return;
            }

            if (token && key && repoName) {
                $historySelect.empty();

                $.ajax({
                    type: 'GET',
                    url: `${BASE_API_URL}/repos/${username}/${repoName}/commits`,
                    headers: {
                        'Authorization': `token ${token}`
                    },
                    data: JSON.stringify({
                        author: username,
                        since: `${startDate}T00:00:00Z`,
                        until: `${endDate}T23:59:59Z`
                    }),
                    dataType: 'json',
                    success: function (data) {
                        for (var currentCommit of data) {
                            $historySelect.append($('<option>', {
                                value: currentCommit.sha,
                                text: currentCommit.commit.committer.date
                            }));
                        }
                    }, error: apiError
                });
            } else {
                alertify.notify('The github token, key or the repo is undefined!', 'warning', 5);
            }
        });
    });

    $("#historyRestoreBtn").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;
            var key = github.security.key;
            var token = github.token;
            var repoName = github.repo;
            var username = github.user;
            var config = {iv: github.security.iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7};

            alertify.confirm('Confirmation', 'Do you really want to replace your local bookmarks with those of the server?', function () {
                var $historySelect = $("#historySelect option:selected");
                var selectedSha = $historySelect.val();

                overrideLocalByRemote(token, username, repoName, selectedSha, key, config);
            }, function () {
            });


        });
    });

    $("#btnCallGithubOverrideLocal").click(function () {
        alertify.confirm('Confirmation', 'Do you really want to replace your local bookmarks with those of the server?', function () {
            executeBookmarkAction(OVERRIDE_LOCAL_WITH_SERVER);
        }, function () {
        });
    });

    $("#btnCallGithubOverrideServer").click(function () {
        alertify.confirm('Confirmation', 'Do you really want to save those bookmark to the server?', function () {
            executeBookmarkAction(OVERRIDE_SERVER_WITH_LOCAL);
        }, function () {
        });
    });

    $("#btnInit").click(function () {
        browser.storage.local.get("github", function (item) {
            let github = item.github;

            if (!github) {
                github = {};
            }
            github.init = true;
            hideInitAndShowMainView();
            browser.storage.local.set({
                github: github
            });
        });
    });
}

function hideInitAndShowMainView() {
    const $popupInitWarning = $("#popup-init-warning");
    const $popupContent = $("#popup-content");

    $popupInitWarning.hide();
    $popupContent.show();
}

function setComponentsDefaultValues() {
    $('.history-date').pickadate({
        format: 'yyyy-mm-dd'
    });

    var aWeekAgo = new Date();
    aWeekAgo.setDate(aWeekAgo.getDate() - 5);

    $("#historyDateStart").val(aWeekAgo.getFullYear() + '-' + ("0" + (aWeekAgo.getMonth() + 1)).slice(-2) + '-' + aWeekAgo.getDate());

    browser.storage.local.get("github", function (item) {
        var github = item.github;
        var encodedKey;

        if (github) {
            encodedKey = btoa(JSON.stringify(github.security));

            $('#inputGithubToken').val(github.token);
            $('#inputRepoName').val(github.repo);
            $("#inputAesSecurity").val(encodedKey);

            if (!github.init) {
                $("#txtAreaKeyInit").text(encodedKey);
            } else {
                hideInitAndShowMainView();
            }

        } else {
            github = {
                init: false,
                security: {
                    key: CryptoJS.lib.WordArray.random(64).toString(),
                    iv: CryptoJS.lib.WordArray.random(16).toString()
                }
            };
            browser.storage.local.set({
                github: github
            });

            encodedKey = btoa(JSON.stringify(github.security));

            $("#inputAesSecurity").val(encodedKey);
            $("#txtAreaKeyInit").text(encodedKey);
        }
    });
}

function apiError(xhr, ajaxOptions, thrownError) {
    console.log(`There was an error while fetching the API -> (thrownError -> ${thrownError}, ajaxOptions -> ${JSON.stringify(ajaxOptions)}, xhr -> ${JSON.stringify(xhr)}`)
    showSyncSpinner(false);
}

function disableUiAction(value) {
    let $btnCallGithubOverrideLocal = $("#btnCallGithubOverrideLocal");
    let $btnCallGithubOverrideServer = $("#btnCallGithubOverrideServer");
    let $btnGithubSave = $("#btnGithubSave");
    let $historyRestoreBtn = $("#historyRestoreBtn");
    let $historyFindBtn = $("#historyFindBtn");

    $btnCallGithubOverrideServer.prop("disabled", value);
    $btnCallGithubOverrideLocal.prop("disabled", value);
    $btnGithubSave.prop("disabled", value);
    $historyRestoreBtn.prop("disabled", value);
    $historyFindBtn.prop("disabled", value);

    if (value) {
        $btnCallGithubOverrideLocal.addClass("disabled");
        $btnCallGithubOverrideServer.addClass("disabled");
        $btnGithubSave.addClass("disabled");
        $historyRestoreBtn.addClass("disabled");
        $historyFindBtn.addClass("disabled");
    } else {
        $btnCallGithubOverrideLocal.removeClass("disabled");
        $btnCallGithubOverrideServer.removeClass("disabled");
        $btnGithubSave.removeClass("disabled");
        $historyRestoreBtn.removeClass("disabled");
        $historyFindBtn.removeClass("disabled");
    }
}

function disableBookmarkListeners() {
    browser.runtime.sendMessage({
        evtType: "bookmark",
        action: {
            id: "bookmark_evt_disable",
            value: true
        }
    });
}

function enableBookmarkListeners() {
    browser.runtime.sendMessage({
        evtType: "bookmark",
        action: {
            id: "bookmark_evt_disable",
            value: false
        }
    });
}

browser.runtime.onMessage.addListener(function (message, sender) {
    if (sender.id === "gittyfox@watier.ca") {
        if (message.evtType === "bookmark") {
            var obj = message.action;
            if (obj.id === "bookmark_evt_changed") {
                executeBookmarkAction(OVERRIDE_SERVER_WITH_LOCAL);
            }
        }
    }
});

setComponentsDefaultValues();
setActionTriggers();