import React, { useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";

const useTimeoutError = (errorMessage: string | null) => {
    const [error, setError] = useState(errorMessage);

    useEffect(() => {
        if (errorMessage) {
            const timeout = setTimeout(() => {
                setError(null);
            }, 4000);
            return () => clearTimeout(timeout);
        }
    }, [errorMessage]);

    return [error as string | null, setError] as const;
};

const ChatApp = () => {
    const [error, setError] = useTimeoutError(null);
    const [select, setSelect] = useState<string>("en");
    const [text, setText] = useState<string>("");
    const [messages, setMessages] = useState<{ id: number; lang: string | null; select: string; text: string; loading: boolean; error: string | null; summary: string | null; translatedText: string | null; }[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (messages.length > 0 && messages[messages.length - 1].loading) {
            detectLang(messages.length - 1);
        }
    }, [messages]);

    useEffect(() => {
        if (text) {
            setError(null);
        }
    }, [text]);

    const detectLang = async (messageIndex: number) => {
        try {
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                console.log("AI and languageDetector are supported");
                const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities();
                let detector;
                if (languageDetectorCapabilities?.available === 'no') {
                    console.error("Language detector is not available");
                    throw new Error("Language detector is not available");
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

                const checker = await detector.detect(messages[messageIndex].text);
                if (checker && checker.length > 0) {
                    setMessages(prevMessages =>
                        prevMessages.map((msg, index) =>
                            index === messageIndex ? { ...msg, lang: checker[0]?.detectedLanguage, loading: false } : msg
                        )
                    );
                }
            } else {
                throw new Error("AI and languageDetector are not supported");
            }
        } catch (err) {
            console.error("Initialization error:", err instanceof Error ? err.message : "Unknown error occurred");
            setError(err instanceof Error ? err.message : "Unknown error occurred");
            setMessages(prevMessages =>
                prevMessages.map((msg, index) =>
                    index === messageIndex ? { ...msg, error: err instanceof Error ? err.message : "Unknown error occurred", loading: false } : msg
                )
            );
        }
    };

    const sendMsg = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const newMessage = {
            id: messages.length + 1,
            lang: null,
            select,
            text,
            loading: true,
            error: null,
            summary: null,
            translatedText: null,
        };
        setMessages([...messages, newMessage]);
        setText(""); // Clear the textarea state
    };

    const displayLang = (lang: string | null) => {
        if (lang) {
            const langInHuman = new Intl.DisplayNames([lang], { type: "language" });
            return langInHuman.of(lang);
        }
        return null;
    };

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, messageIndex: number) => {
        const newSelect = e.target.value;
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, select: newSelect } : msg
            )
        );
    };

    const onTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
    };

    const onSummarize = async (messageIndex: number) => {
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, loading: true } : msg
            )
        );
        try {
            const message = messages[messageIndex];
            if (message.text.length >= 150) {
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

                    const summaryResult = await summarize.summarize(message.text);
                    setMessages(prevMessages =>
                        prevMessages.map((msg, index) =>
                            index === messageIndex ? { ...msg, summary: summaryResult, loading: false } : msg
                        )
                    );
                }
            }
        } catch (err) {
            setMessages(prevMessages =>
                prevMessages.map((msg, index) =>
                    index === messageIndex ? { ...msg, error: err instanceof Error ? err.message : "Summarization failed", loading: false } : msg
                )
            );
        }
    };

    const onKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMsg();
        }
    }

    const handleSendMsg = () => {
        const event = new Event('submit', { bubbles: true, cancelable: true });
        const form = document.querySelector('form');
        form?.dispatchEvent(event);
    }
    const onTranslate = async (messageIndex: number) => {
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, loading: true } : msg
            )
        );
        try {
            const message = messages[messageIndex];
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "translator" in self.ai) {
                console.log("Translate is supported");
                const translateCapa = await (self.ai as any)?.translator?.capabilities();
                let translate;
                if (translateCapa === 'no') {
                    throw new Error("Translate is not available");
                } else if (translateCapa === 'readily') {
                    translate = await (self.ai as any).translator.create();
                } else {
                    console.log("Ready to download Translator AI model");
                    if (!message.lang) throw new Error("Language not detected");
                    if (message.select === message.lang) throw new Error("Cannot translate to the same language");
                    if (!message.select) throw new Error("Select a language to translate to");

                    translate = await (self.ai as any).translator.create({
                        sourceLanguage: message.lang,
                        targetLanguage: message.select,
                        monitor(m: EventTarget) {
                            m.addEventListener("downloadprogress", (event: Event) => {
                                const e = event as any as { loaded: number, total: number };
                                console.log("Downloading Translator AI model", { loaded: e.loaded, total: e.total });
                            });
                        }
                    });
                }
                if (!translate) throw new Error("Failed to create translator");
                const translatedText = await translate.translate(message.text);
                setMessages(prevMessages =>
                    prevMessages.map((msg, index) =>
                        index === messageIndex ? { ...msg, translatedText, loading: false } : msg
                    )
                );
            } else {
                console.error("Translate is not supported");
                throw new Error("Translate is not supported");
            }
        } catch (err) {
            setMessages(prevMessages =>
                prevMessages.map((msg, index) =>
                    index === messageIndex ? { ...msg, error: err instanceof Error ? err.message : "Translation failed", loading: false } : msg
                )
            );
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto relative flex flex-col h-screen p-8 bg-[#C9DDEE] text-[#27568B]">
            <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                    {messages.map((data, index) => (
                        <article key={index} className="mb-4">
                            {data.error && <p className="text-red-500 w-fit mx-auto text-[.8rem] mb-4">{data.error}</p>}
                            <div className="flex flex-row justify-end">
                                <p className="p-4 items-end border border-[#B68250] rounded-2xl text-[1.2rem] w-fit max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-2">{data.text}</p>
                            </div>
                            {displayLang(data.lang) && <p className="mb-4">{displayLang(data.lang)}</p>}
                            {data.summary && <p className="mb-4">{data.summary}</p>}
                            {data.text.length >= 150 && data.lang !== null && data.lang === 'en' && !data.summary && (
                                <button
                                    onClick={() => onSummarize(index)}
                                    className={`${data.loading ? 'cursor-not-allowed' : 'cursor-pointer'} bg-[#27568B] text-white py-2 px-4 rounded mb-4`}
                                >
                                    {data.loading ? 'Summarizing...' : 'Summarize'}
                                </button>
                            )}
                            {data.translatedText && <p className="mb-4">{data.translatedText}</p>}
                            <select value={data.select} onChange={(e) => onSelectChange(e, index)} className="bg-[#27568B] text-white py-2 px-4 rounded mb-4">
                                <option value="en">English</option>
                                <option value="pt">Portuguese</option>
                                <option value="fr">French</option>
                                <option value="ru">Russian</option>
                                <option value="tr">Turkish</option>
                                <option value="es">Spanish</option>
                            </select>
                            <button
                                disabled={data.loading}
                                onClick={() => onTranslate(index)}
                                className={`bg-[#27568B] ${data.loading ? 'cursor-not-allowed' : 'cursor-pointer'} text-white py-2 px-4 rounded mb-4`}
                            >
                                {data.loading ? 'Translating...' : 'Translate'}
                            </button>
                        </article>
                    ))}
                </div>
            </div>

            <form onSubmit={sendMsg} className="w-full">
                <div className="relative">
                    <textarea
                        className="w-full border-gray-400 rounded-2xl min-h-[10rem] border p-4 pr-10 bg-[#27568B] text-white"
                        placeholder="Send message..."
                        value={text}
                        onChange={onTextChange}
                        onKeyPress={onKeyPress}
                    />
                    <button type="submit" className="text-[#B68250] absolute bottom-1 right-0 cursor-pointer hover:bg-[#47A1C4] font-bold py-2 px-4 rounded">
                        <IoMdSend />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatApp;