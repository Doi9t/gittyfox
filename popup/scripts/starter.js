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


function createTheWindow() {
    browser.windows.create({
        type: "detached_panel",
        url: "popup/options.html",
        width: 550,
        height: 500
    });
}

function bookmarkEvent() {
    //Send a message to tell that the bookmarks are changed / updated
    browser.runtime.sendMessage({
        evtType: "bookmark",
        action: {
            id: "bookmark_evt_changed"
        }
    });
}

browser.runtime.onMessage.addListener(function (message, sender) {
    if (sender.id === "gittyfox@watier.ca") {
        if (message.evtType === "bookmark") {
            var obj = message.action;

            if (obj.id === "bookmark_evt_disable" && obj.value) {
                disableBookmarkListeners();
            } else {
                enableBookmarkListeners();
            }
        }
    }
});

function disableBookmarkListeners() {
    browser.bookmarks.onChanged.removeListener(bookmarkEvent);
    browser.bookmarks.onMoved.removeListener(bookmarkEvent);
    browser.bookmarks.onCreated.removeListener(bookmarkEvent);
    browser.bookmarks.onRemoved.removeListener(bookmarkEvent);
    console.log("Service - Bookmarks events disabled");
}

function enableBookmarkListeners() {
    browser.bookmarks.onChanged.addListener(bookmarkEvent);
    browser.bookmarks.onMoved.addListener(bookmarkEvent);
    browser.bookmarks.onCreated.addListener(bookmarkEvent);
    browser.bookmarks.onRemoved.addListener(bookmarkEvent);
    console.log("Service - Bookmarks events enabled");
}

//Enable the events on start
enableBookmarkListeners();
browser.browserAction.onClicked.addListener(createTheWindow);