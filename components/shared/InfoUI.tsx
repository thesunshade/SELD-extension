import React from "react";
import { BUILD_INFO } from "../../utils/build-info";
import "./InfoUI.css";

export const InfoUI: React.FC = () => {
    return (
        <div className="info-pane glassmorphism custom-scroll">
            <h3>About</h3>
            <p>The Sinhala-English Learner’s Dictionary (SELD) is an experimental draft of a dictionary targeted at English speakers learning English. Please report errors using the feedback button on each entry.</p>

            <div className="info-pane-meta">
                <ul className="info-meta">
                    <li ><strong>Version: </strong><a rel="noreferrer" target="_blank" href="https://github.com/thesunshade/SELD-extension/blob/main/changelog.md#experimental-sinhala-english-learners-dictionary-browser-extension" title="Visit change log">{BUILD_INFO.version}</a></li>
                    <li><strong>Dictionary Date:</strong> {BUILD_INFO.dictionaryDate}</li>
                    <li><strong>Entries:</strong> {BUILD_INFO.entryCount.toLocaleString()}</li></ul>
            </div>

            <p>Double click or select words on any web page to look up. You can also use the Dictionary Explorer to browse entries alphabetically.</p>
            <p>Text to speech provided by Google.</p>

            <details>
                <summary>Pages to try</summary>
                <p style={{ marginTop: "1em", fontSize: "0.9em" }}>The following pages have good coverage in the SELD</p>
                <ul className="test-sites">
                    <li>
                        <a rel="noreferrer" target="_blank" href="https://mahamegha.lk/2022/04/23/sirapa-wandanawa/">
                            සිරිපා වන්දනාවේ ගිය ගැමි කවියෝ
                        </a>
                    </li>
                    <li>
                        <a rel="noreferrer" target="_blank" href="https://tripitaka.online/sutta/7478">
                            අංගුත්තර නිකාය තික නිපාතෝ 3.1.1.1.{" "}
                        </a>
                    </li>
                </ul>
            </details>
        </div>
    );
};
