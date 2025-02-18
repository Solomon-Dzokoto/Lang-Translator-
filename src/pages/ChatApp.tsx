import React, { useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";

interface LanguageDetectionResult {
    confidence: number;
    detectedLanguage: string;
}

const useTimeoutError = (errorMessage:string | null) =>{

    const [error,setError] = useState(errorMessage);
    useEffect(()=>{
        const timeout = setTimeout(()=>{
            setError(null)
        },4000)
        return ()=>clearTimeout(timeout)
    },[errorMessage])

    return [error as string | null, setError] as const
}
const ChatApp = () => {
    const [lang, setLang] = useState<LanguageDetectionResult[] | null>(null);
    const [error, setError] = useTimeoutError(null);
    const [select, setSelect] = useState<string>("en");
    const [text, setText] = useState<string>("");
    const [messages, setMessages] = useState<{ lang: LanguageDetectionResult[] | null; select: string; text: string; loading: boolean; error: string | null; summary: string | null; translatedText: string | null; }[]>([]);
    const [loading,setLoading] = useState<boolean>(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isSend, setIsSend] = useState<boolean>(false);

   

    const detectLang = async () => {
        setLoading(true);
        try {
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                console.log("AI and languageDetector are supported");
                const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities();
                let detector;
                if (languageDetectorCapabilities?.available === 'no') {
                    console.error("Language detector is not available");
                } else if (languageDetectorCapabilities?.available === 'readily') {
                    detector = await (self.ai as any).languageDetector?.create();
                    console.log("Language detector is readily available");
                } else {
                    detector = await (self.ai as any).languageDetector?.create({
                        monitor(m: EventTarget) {
                            const downloadListener = (event: Event) => {
                                const e = event as unknown as { loaded: number, total: number };
                                console.log("Downloading language detector model", e.loaded, "of", e.total);
                            };
                            m.addEventListener("downloadprogress", downloadListener);
                            return () => m.removeEventListener("downloadprogress", downloadListener);
                        }
                    });
                }

                if (!detector) {
                    throw new Error("Failed to create detector");
                }

                if (text) {
                    const checker = await detector.detect(text);
                    setLang(checker);
                    setLoading(false);
                } else {
                    console.log("No text to detect");
                }
            } else {
                throw new Error("AI and languageDetector are not supported");
            }
        } catch (err) {
            console.error("Initialization error:", err instanceof Error ? err.message : "Unknown error occurred");
            setError(err instanceof Error ? err.message : "Unknown error occurred");
            setLoading(false);
        }
    };

    const sendMsg = (e: React.FormEvent<HTMLFormElement>) => {
        setLoading(true);
        e.preventDefault();
        detectLang();
        setIsSend(true);
        const data = {
            lang,
            select,
            text,
            loading,
            error,
            summary,
            translatedText,
        };
        setMessages([...messages, data]);
        //clear textarea value after sending message
        setText(""); 
        setLoading(false);
    };

    const displayLang = () => {
        if (lang && lang.length > 0) {
            const chosenLang = lang[0].detectedLanguage;
            const langInHuman = new Intl.DisplayNames([chosenLang], { type: "language" });
            console.log(langInHuman.of(chosenLang));
            return langInHuman.of(chosenLang);
        }
    };

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelect(e.target.value);
    };

    const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    const inHumanLang = displayLang();

    const onSummarize = async () => {
        setLoading(true);
        setError(null);
        try {
            if (text.length >= 150) {
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
                                const downloadListener = (event: Event) => {
                                    const e = event as unknown as { loaded: number, total: number };
                                    console.log('Debug - Progress Event:', { loaded: e.loaded, total: e.total });
                                };
                                return () => m.removeEventListener("downloadprogress", downloadListener);
                            }
                        });
                    }

                    if (!summarize) {
                        throw new Error("Failed to create summarizer");
                    }

                    const summaryResult = await summarize.summarize(text);
                    setSummary(summaryResult);
                    setLoading(false);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Summarization failed");
            console.error(err instanceof Error ? err.message : "Summarization failed");
            setLoading(false);
        }
    };

    const onTranslate = async () => {
       
        setLoading(true);
        try {
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "translator" in self.ai) {
                console.log("Translate is supported");
                const translateCapa = await (self.ai as any)?.translator?.capabilities();
                console.log("Translate capabilities:", translateCapa);
                let translate;
                if (translateCapa === 'no') {
                    throw new Error("Translate is not available");
                } else if (translateCapa === 'readily') {
                    translate = await (self.ai as any).translator.create();
                } else {
                    console.log("Ready to download Translator AI model");
                    if (!lang) throw new Error("Language not detected");
                    if (select === lang[0].detectedLanguage) throw new Error("Cannot translate to the same language");
                    if (!select) throw new Error("Select a language to translate to");

                    translate = await (self.ai as any).translator.create({
                        sourceLanguage: lang[0].detectedLanguage,
                        targetLanguage: select,
                        monitor(m: EventTarget) {
                            m.addEventListener("downloadprogress", (event: Event) => {
                                const e = event as any as { loaded: number, total: number };
                                console.log("Downloading Translator AI model", { loaded: e.loaded, total: e.total });
                            });
                        }
                    });
                }
                if (!translate) throw new Error("Failed to create translator");
                const translatedText = await translate.translate(text);
                setTranslatedText(translatedText);
                setLoading(false);
           } else {
                console.error("Translate is not supported");
                throw new Error("Translate is not supported");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Translation failed");
            console.error(err instanceof Error ? err.message : "Translation failed");
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto relative flex flex-col h-screen p-8  text-white">
            <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                    {messages.map((data, index) => (
                        < article key={index} className="">
                            {error && <p className="text-red-500 w-fit mx-auto text-[.8rem] mb-4">{data?.error}</p>}
                            <div className="flex  flex-row justify-end">
                                <p className="p-4 items-end border border-[#EA9950] rounded-2xl text-[1.2rem] w-fit max-w-[80%] bg-[#E4D2CC] text-[#EA9950] mb-2">{data?.text}</p>
                            </div>
                            {inHumanLang && <p className="mb-4">{inHumanLang}</p>}
                            {summary && <p className="mb-4">{data?.summary}</p>}
                            {data?.text.length >= 150 && (data?.lang as LanguageDetectionResult[])[0]?.detectedLanguage === 'en' && <button onClick={onSummarize} className={`${data.loading?"cursor-not-allowed":"cursor-pointer"} bg-[#9B84C3] text-white py-2 px-4 rounded mb-4`}>{data?.loading?"Summarizing...":"Summarize"}</button>}
                            {translatedText && <p className="mb-4">{data?.translatedText}</p>}
                            <select value={data?.select} onChange={onSelectChange} className="bg-[#4D2CC] text-white py-2 px-4 rounded mb-4">
                                <option value="en">English</option>
                                <option value="pt">Portuguese</option>
                                <option value="fr">French</option>
                                <option value="ru">Russian</option>
                                <option value="tr">Turkish</option>
                                <option value="es">Spanish</option>
                            </select>
                            <button disabled={data?.loading} onClick={onTranslate} className={`bg-[#9B84C3] ${data?.loading?"cursor-not-allowed":"cursor-pointer"} cursor-auto text-white py-2 px-4 rounded mb-4`}>{data?.loading ? "Translating..."
                          :  "Translate"}</button>
                        </article>
                    ))}
                </div>
            </div>
          
            <form onSubmit={sendMsg} className="w-full">
                <div className="relative">
                    <textarea
                        className="w-full border-gray-400 rounded-2xl min-h-[10rem] border p-4 pr-10 bg-[#4D2CC] text-white"
                        placeholder="Send message..."
                        value={text}
                        onChange={onTextChange}
                    />
                    <button type="submit" className="text-[#EA9950] absolute bottom-1 right-0 cursor-pointer hover:bg-[#9B84C3] font-bold py-2 px-4 rounded"><IoMdSend /></button>
                </div>
            </form>
        </div>
    );
};

export default ChatApp;
