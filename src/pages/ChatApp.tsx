import { useEffect, useState } from "react";

interface LanguageDetectionResult {
    confidence: number;
    detectedLanguage: string;
}

const ChatApp = () => {
    const [checker, setChecker] = useState<any>(null);
    const [lang, setLang] = useState<LanguageDetectionResult[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ local: number; total: number } | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number } | null>(null);

    const text = "comment vas-tu ?";

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const langDetector = async () => {
            try {
                if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                    console.log("AI and languageDetector are supported");
                    const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities();
                    let detector;
                    
                    if (languageDetectorCapabilities?.available === 'no') {
                        console.log("Language detector is not available");
                        if (signal.aborted) return;
                    } else if (languageDetectorCapabilities?.available === 'readily') {
                        detector = await (self.ai as any).languageDetector?.create();
                        console.log("Language detector is readily available");

                    } else {
                        detector = await (self.ai as any).languageDetector?.create({
                            monitor(m: EventTarget) {
                                const downloadListener = (event: Event) => {
                                    const e = event as unknown as { loaded: number, total: number };
                                    setDownloadProgress({
                                        loaded: e.loaded,
                                        total: e.total
                                    });
                                };

                                m.addEventListener("downloadprogress", downloadListener);
                                signal.addEventListener('abort', () => {
                                    m.removeEventListener("downloadprogress", downloadListener);
                                });

                                return () => m.removeEventListener("downloadprogress", downloadListener);
                            }
                        });
                    }

                    if (!detector) {
                        throw new Error("Failed to create detector");
                    }

                    setChecker(detector);
                } else {
                    throw new Error("AI and languageDetector are not supported");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                console.error("Initialization error:", errorMessage);
                setError(errorMessage);
            }
        };

        langDetector();
        return () => {
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (!checker) return;
        const detectLang = async () => {
            try {
                if (typeof checker.detect !== 'function') {
                    throw new Error("Detector not properly initialized");
                }
                const results = await checker.detect(text);
                if (results) {
                    setLang(results);
                } else {
                    throw new Error("No detection results returned");
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
                console.error("Detection error:", errorMessage);
                setError(errorMessage);
            }
        };

        detectLang();
    }, [checker]);

    useEffect(() => {
      
        const controller = new AbortController();
        const { signal } = controller;
    

        const summarizerFunc = async () => {
            try {
            
                if (typeof self === "object" && self && "ai" in self && typeof self.ai === "object" && self.ai !== null && "summarizer" in self.ai) {
                    const summarizerCapa = await (self.ai as { summarizer: { capabilities: () => Promise<{ available: string }> } }).summarizer?.capabilities();
                    let summarize;

                    if (summarizerCapa?.available === 'no') {
                        console.error("Summarizer is not available");
                        throw new Error("Summarizer is not available");
                    } else if (summarizerCapa?.available === 'readily') {
                        summarize = await (self.ai as any).summarizer?.create();
                        console.log("Summarizer is readily available");
                    } else {
                        summarize = await (self.ai as any).summarizer?.create({
                            monitor(m: EventTarget) {
                                console.log("ready to download summarizer model");
                                // const downloadListener = (event: Event) => {
                                //     const e = event as unknown as { loaded: number, total: number };
                                //     console.log('Debug - Progress Event:', { loaded: e.loaded, total: e.total });
                                //     setProgress({
                                //         local: e.loaded,
                                //         total: e.total
                                //     });
                                // };

                                m.addEventListener("downloadprogress", (event: Event) => {
                                    const e = event as unknown as { loaded: number, total: number };
                                    console.log('Debug - Progress Event:', { loaded: e.loaded, total: e.total });
                                    setProgress({
                                        local: e.loaded,
                                        total: e.total
                                    });
                                });
                                // signal.addEventListener('abort', () => {
                                //     m.removeEventListener("downloadprogress", downloadListener);
                                // });

                                // return () => m.removeEventListener("downloadprogress", downloadListener);
                            }
                        });
                    }

                    if (!summarize) {
                        throw new Error("Failed to create summarizer");
                    }

                    const summaryResult = await summarize.summarize(text);
                    setProgress(null);
                    setSummary(summaryResult);
                }
            } catch (err) {
                if (!signal.aborted) {
                    setError(err instanceof Error ? err.message : "Summarization failed");
                }
            }
        };

        summarizerFunc();

        return () => {
            controller.abort();
        };
    }, [text]);

    useEffect(() => {
        const translateFunc = async () =>{
           const controller = new AbortController();
            const { signal } = controller;

            //checking of translate is supported
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "translator" in self.ai) {
                console.log("Translate is supported");
            const translateCapa = await (self.ai as any)?.translator?.capabilities();
            let translate;
            if(translateCapa === 'no'){
                console.error("Translate is not supported");
            }else if(translateCapa === 'readily'){
                translate = await (self.ai as any).translator.create();
                console.log("Translate is readily available");
            }else {
                console.log("Ready to download Translator AI model")
                translate = await (self.ai as any).translator.create({
                    sourceLanguage :"fr",
                    targetLanguage: "en",
                    monitor (m: EventTarget) {
                        m.addEventListener("downloadprogress", (event: Event) => {
                        const  e = event as any as { loaded: number, total: number };
                          console.log("Downloading Translator AI model", {loaded: e.loaded, total: e.total})
                        })

                    }
                })
            }
            const translatedText = await translate.languagePairAvailable()
            console.log("Translate capabilities:", translatedText);
            }else{
                console.error("Translate is not supported")
            }

        }
        translateFunc()

    }, [])

    return (
        <div className="p-4">
            {error && <p className="text-red-500 mb-4">Error: {error}</p>}
            {lang ? (
                <h1 className="text-xl font-bold mb-4">
                    Detected Language: {lang[0].detectedLanguage}
                </h1>
            ) : (
                <p>Detecting language...</p>
            )}
            {progress && progress.total > 0 && (
                <div className="mb-4 p-4 border rounded">
                    <p className="mb-2">
                        Downloaded: {((progress.local / progress.total) * 100).toFixed(1)}%
                    </p>
                    <div className="relative w-full h-4 bg-gray-200 border rounded">
                        <progress
                            value={progress.local}
                            max={progress.total}
                            className="w-full h-full"
                        />
                    </div>
                    <p className="mt-2 text-sm">
                        {(progress.local / 1024 / 1024).toFixed(2)} MB of {(progress.total / 1024 / 1024).toFixed(2)} MB
                    </p>
                </div>
            )}
            {summary && (
                <div>
                    <h2>Summary:</h2>
                    <p>{summary}</p>
                </div>
            )}
            {downloadProgress && (
                <div style={{ marginBottom: '1rem' }}>
                    <p>Downloading AI model...</p>
                    <progress
                        value={downloadProgress.loaded}
                        max={downloadProgress.total}
                    />
                    <p>
                        {Math.round((downloadProgress.loaded / downloadProgress.total) * 100)}%
                        ({(downloadProgress.loaded / 1048576).toFixed(2)} MB of {(downloadProgress.total / 1048576).toFixed(2)} MB)
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChatApp;
