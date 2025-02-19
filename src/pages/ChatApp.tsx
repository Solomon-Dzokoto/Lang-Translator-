import React, { useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import {FaLoadi}
// Message animation variants
const messageVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -100 }
};

// Button hover animation
const buttonVariants = {
    hover: { scale: 0.95 },
    tap: { scale: 1.05 }
};

// Container animation
const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

const ChatApp = () => {

    const [text, setText] = useState<string>("");
    const [messages, setMessages] = useState<{ id: number; lang: string | null; select: string; text: string; percent: number | null; loading: boolean; error: string | null; summary: string | null; translatedText: string | null; }[]>([]);
    const [isSend, setIsSend] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (messages.length > 0 && isSend) {
            detectLang(messages.length - 1);
            setIsSend(false)
        }
    }, [messages, isSend]);


    const catchError = (dataIndex: number, msg: string) => {
        setMessages(prev => prev.map((item, i) => i === dataIndex ? { ...item, error: msg, loading: false } : item))

        setTimeout(() => {
            setMessages(prev => prev.map((item, i) => i === dataIndex ? { ...item, error: null, loading: false } : item))
        }, 4000)

    }

    const detectLang = async (messageIndex: number) => {
        try {
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                console.log("AI and languageDetector are supported");
                const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities();
                let detector;
                if (languageDetectorCapabilities?.available === 'no') {
                    console.error("Language detector is not available");
                    throw new Error("Language detector is not available");
                }
                if (languageDetectorCapabilities?.available === 'readily') {
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
                            index === messageIndex ? { ...msg, lang: checker[0]?.detectedLanguage, percent: checker[0]?.confidence } : msg
                        )
                    );
                }
            } else {
                throw new Error("AI and languageDetector are not supported");
            }
        } catch (err) {
            console.error("Initialization error:", err instanceof Error ? err.message : "Unknown error occurred");
            catchError(messageIndex, err instanceof Error ? err.message : "Initialization error occurred");
        }
    };

    const sendMsg = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!text.trim()) {
            catchError(messages.length - 1, "Please enter a message");
            return;
        }

        const newMessage = {
            id: messages.length + 1,
            lang: null,
            select: "en",
            percent: null,
            text,
            loading: false,
            error: null,
            summary: null,
            translatedText: null,
        };

        setMessages(prev => [...prev, newMessage]);
        setText("");
        setIsSend(true);
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
        setLoading(true)
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
                            index === messageIndex ? { ...msg, summary: summaryResult } : msg
                        )
                    );
                    setLoading(false)
                }
            }
        } catch (err) {
            catchError(messageIndex, err instanceof Error ? err.message : "Summarization failed");
            setLoading(false)
        }
    };

    const onKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        if (!target.value.trim()) return;
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

        const currentMessages = [...messages];
        const message = currentMessages[messageIndex];

        // Set loading state only for the specific message
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, loading: true } : msg // Remove the else part
            )
        );

        try {
            if (!message.lang || !message.select) throw new Error("Language not detected or not selected");
            if (message.select === message.lang) throw new Error("Cannot translate to the same language");

            let translate;
            if (typeof self === 'object' && "ai" in self && self && typeof self.ai === "object" && self.ai !== null) {
                console.log("Translate is supported");
                const translateCapa = await (self.ai as any)?.translator?.capabilities();

                if (translateCapa === 'no') throw new Error("Translate is not available");
                if (translateCapa === 'readily') {
                    translate = await (self.ai as any).translator.create();
                } else {
                    console.log("Ready to download Translator AI model");
                    translate = await (self.ai as any).translator.create({
                        sourceLanguage: message.lang,
                        targetLanguage: message.select,
                        monitor(m: EventTarget) {
                            const downloadListener = (event: Event) => {
                                const e = event as any as { loaded: number, total: number };
                                console.log("Downloading Translator AI model", { loaded: e.loaded, total: e.total });
                            };
                            m.addEventListener("downloadprogress", downloadListener);
                            return () => m.removeEventListener("downloadprogress", downloadListener);
                        }
                    });
                }

                if (!translate) throw new Error("Failed to create translator");

                const translatedText = await translate.translate(message.text);

                new Promise((resolve) => setTimeout(() => resolve, 1000))

                // Update only the translated message's state
                setMessages(prevMessages =>
                    prevMessages.map((msg, index) =>
                        index === messageIndex ? { ...msg, translatedText, loading: false } : msg
                    )
                );
            } else {
                throw new Error("Translate is not supported");
            }
        } catch (err) {

            catchError(messageIndex, err instanceof Error ? err.message : "Translation failed");
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            animate="animate"
            className="w-full max-w-4xl mx-auto relative flex flex-col min-h-screen p-4 md:p-8 bg-[#C9DDEE] text-[#27568B]"
        >
            <div className="flex-1 overflow-y-auto">
                <AnimatePresence>
                    <div className="mb-4 space-y-6">
                        {messages.map((data, index) => (
                            <motion.article
                                key={index}
                                variants={messageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="mb-4 transition-all"
                                layout
                            >
                                <div
                                    className="flex flex-row justify-end"

                                >
                                    <p className="p-4 items-end border flex-wrap text-wrap border-[#B68250] rounded-2xl text-[1rem] md:text-[1.2rem] w-fit max-w-[90%] md:max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-2 shadow-lg">
                                        {data.text}
                                    </p>
                                </div>

                                {displayLang(data.lang) && data.percent !== null && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="mb-4 justify-end flex text-green-600 text-sm md:text-base"
                                    >
                                        I am {(data.percent * 100).toFixed(2)}% sure that is an/a {displayLang(data.lang)} language
                                    </motion.p>
                                )}

                                <div className="justify-end items-center flex flex-wrap gap-2">
                                    <small className="mb-4 mr-2">Translate to</small>
                                    <select
                                        value={data.select}
                                        onChange={(e) => onSelectChange(e, index)}
                                        className="text-[#27568B] border mr-4 border-[#27568B] py-2 px-4 rounded mb-4 bg-white/80 backdrop-blur-sm"
                                    >
                                        <option value="en">English</option>
                                        <option value="pt">Portuguese</option>
                                        <option value="fr">French</option>
                                        <option value="ru">Russian</option>
                                        <option value="tr">Turkish</option>
                                        <option value="es">Spanish</option>
                                    </select>
                                    <motion.button
                                        variants={buttonVariants}
                                        whileHover="hover"
                                        whileTap="tap"
                                        disabled={data.loading}
                                        onClick={() => onTranslate(index)}
                                        className={`bg-[#27568B] ${data.loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} text-white py-2 px-4 rounded mb-4 shadow-md hover:shadow-lg transition-shadow`}
                                    >
                                        {data.loading ? 'Translating...' : 'Translate'}
                                    </motion.button>
                                </div>

                                {/* Summarize button */}
                                {data.text.length >= 150 && data.lang !== null && data.lang === 'en' && !data.summary && (
                                    <motion.div
                                        className="flex justify-end"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <motion.button
                                            variants={buttonVariants}
                                            whileHover="hover"
                                            whileTap="tap"
                                            disabled={loading}
                                            onClick={() => onSummarize(index)}
                                            className={`${loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} bg-[#27568B] text-white py-2 px-4 rounded mb-4 shadow-md hover:shadow-lg transition-shadow`}
                                        >
                                            {data.loading ? 'Summarizing...' : 'Summarize'}
                                        </motion.button>
                                    </motion.div>
                                )}

                                {/* Error message */}
                                <AnimatePresence>
                                    {data.error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="text-red-500 w-fit mx-auto text-[.8rem] mb-4"
                                        >
                                            {data.error}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                {/* Summary and Translation results */}
                                <AnimatePresence>
                                    {data.summary && (
                                        <motion.p
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 50 }}
                                            className="p-4 items-end list-none border border-[#B68250] rounded-2xl text-[1rem] md:text-[1.2rem] w-fit max-w-[90%] md:max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-4 shadow-lg"
                                        >
                                            <span className="text-[#B68250] font-semibold">Summary</span>
                                            <br />
                                            {data.summary}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {data.translatedText && (
                                        <motion.p
                                            initial={{ opacity: 0, x: 50 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 50 }}
                                            className="p-4 items-end list-none border border-[#B68250] rounded-2xl text-[1rem] md:text-[1.2rem] w-fit max-w-[90%] md:max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-4 shadow-lg"
                                        >
                                            <span className="text-[#B68250] font-semibold">Translation</span>
                                            <br />
                                            {data.translatedText}
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </motion.article>
                        ))}
                    </div>
                </AnimatePresence>
            </div>

            <motion.form
                onSubmit={sendMsg}
                className="w-full mt-4"
                initial={{ y: 50 }}
                animate={{ y: 0 }}
            >
                <div className="relative">
                    <textarea
                        className="w-full border-gray-400 rounded-2xl min-h-[8rem] md:min-h-[10rem] border p-4 pr-10 bg-[#27568B] text-white resize-none shadow-lg focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none"
                        placeholder="Send message..."
                        value={text}
                        onChange={onTextChange}
                        onKeyPress={onKeyPress}
                    />
                    <motion.button
                        type="submit"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                        className="text-[#B68250] absolute bottom-4 right-4 cursor-pointer hover:bg-[#47A1C4] font-bold p-2 rounded-full bg-white/10 backdrop-blur-sm"
                    >
                        <IoMdSend size={24} />
                    </motion.button>
                </div>
            </motion.form>
        </motion.div>
    );
};

export default ChatApp;