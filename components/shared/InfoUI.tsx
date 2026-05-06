import React from "react";
import { BUILD_INFO } from "../../utils/build-info";
import { sendMessage } from "../../utils/messaging";
import "./InfoUI.css";

export const InfoUI: React.FC = () => {
    return (
        <div className="info-pane blur custom-scroll">
            <h3>About</h3>
            <p>The Sinhala-English Learner’s Dictionary (SELD) is an experimental draft of a dictionary for English speakers learning Sinhala. Report errors using the feedback button.</p>
            <p>Click words on any web page to look up. You can also use the Dictionary Explorer to browse entries alphabetically.</p>
            <p>Text to speech provided by Google.</p>

            <div className="info-pane-meta">
                <ul className="info-meta">
                    <li ><strong>Version: </strong><a rel="noreferrer" target="_blank" href="https://github.com/thesunshade/SELD-extension/blob/main/changelog.md#experimental-sinhala-english-learners-dictionary-browser-extension" title="Visit change log">{BUILD_INFO.version}</a></li>
                    <li><strong>Dictionary Date:</strong> {BUILD_INFO.dictionaryDate}</li>
                    <li><strong>Entries:</strong> {BUILD_INFO.entryCount.toLocaleString()}</li></ul>
            </div>


            <h3>
                Test drive
            </h3>
            <p><a
                href={browser.runtime.getURL("/explore.html")}
                onClick={(e) => {
                    e.preventDefault();
                    sendMessage('OPEN_URL', { url: browser.runtime.getURL("/explore.html") });
                }}
            >
                Here are some pages
            </a> to try out the extension.</p>
        </div>
    );
};
