import React from "react";
import { BUILD_INFO } from "../../utils/build-info";
import "./InfoUI.css";

export const InfoUI: React.FC = () => {
    return (
        <div className="info-pane blur custom-scroll">
            <h3>About</h3>
            <p>The Sinhala-English Learner’s Dictionary (SELD) is an experimental draft of a dictionary targeted at English speakers learning Sinhala. Please report errors using the feedback button on each entry.</p>

            <div className="info-pane-meta">
                <ul className="info-meta">
                    <li ><strong>Version: </strong><a rel="noreferrer" target="_blank" href="https://github.com/thesunshade/SELD-extension/blob/main/changelog.md#experimental-sinhala-english-learners-dictionary-browser-extension" title="Visit change log">{BUILD_INFO.version}</a></li>
                    <li><strong>Dictionary Date:</strong> {BUILD_INFO.dictionaryDate}</li>
                    <li><strong>Entries:</strong> {BUILD_INFO.entryCount.toLocaleString()}</li></ul>
            </div>

            <p>Double click or select words on any web page to look up. You can also use the Dictionary Explorer to browse entries alphabetically.</p>
            <p>Text to speech provided by Google.</p>

            <h2>
                Test drive
            </h2>
            <p><a
                href={browser.runtime.getURL("/explore.html")}
                onClick={(e) => {
                    e.preventDefault();
                    browser.runtime.sendMessage({ action: 'OPEN_URL', url: browser.runtime.getURL("/explore.html") });
                }}
            >
                Here are some pages
            </a> to try out the extension on.</p>
        </div>
    );
};
