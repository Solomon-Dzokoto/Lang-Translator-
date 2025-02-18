import { useEffect, useState } from "react"

interface LanguageDetectionResult {
    confidence: number,
    detectedLanguage: string
}
const ChatApp = () => {
    const [checker, setChecker] = useState<any>(null)
    const [lang, setLang] = useState<LanguageDetectionResult[] | null>(null)
    const [error, setError] = useState<string | null>(null)


    const text = "comment vas-tu ?"

    useEffect(() => {
        const controller = new AbortController(); // For cleanup
        const { signal } = controller;

        const langDetector = async () => {
            try {
                if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                    console.log("AI and languageDetector are supported")
                    const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities()
                    let detector;
                    console.log("Capabilities:", languageDetectorCapabilities)
                    if (languageDetectorCapabilities?.available === 'no') {
                        console.log("Language detector is not available")
                        if (signal.aborted) return
                    } else if (languageDetectorCapabilities?.available === 'readily') {
                        detector = await (self.ai as any).languageDetector?.create()
                    }
                    else {
                        detector = await (self.ai as any).languageDetector?.create({
                            monitor(m: EventTarget) {
                                m.addEventListener("downloadprogress", (event: Event) => {
                                    const e = event as unknown as { loaded: number, total: number }
                                    console.log(`Downloaded ${e.loaded} of ${e.total}`)
                                })
                            }
                        })
                    }

                    if (!detector) {
                        throw new Error("Failed to create detector")
                    }

                    setChecker(detector)
                } else {
                    throw new Error("AI and languageDetector are not supported")
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                console.error("Initialization error:", errorMessage)

            }
        }

        langDetector()
        return () => {
            controller.abort()
        }
    }, [])

    useEffect(() => {
        if (!checker) return;
        const detectLang = async () => {
            try {
                // Ensure the detector is properly initialized
                if (typeof checker.detect !== 'function') {
                    throw new Error("Detector not properly initialized")
                }
                const results = await checker.detect(text)
                if (results) {
                    setLang(results)
                } else {
                    throw new Error("No detection results returned")
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
                console.error("Detection error:", errorMessage)
                setError(errorMessage)
            }
        }

        detectLang()
    }, [checker])


    

    return (
        <div>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {lang ? <h1>Detected Language: {lang[0].detectedLanguage}</h1> : <p>Detecting language...</p> }
        </div>
    )
}

export default ChatApp
