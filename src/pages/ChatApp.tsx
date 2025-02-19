import React, { useEffect, useState } from "react";
import { IoMdSend } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";
import { FiLoader } from "react-icons/fi";
import Navbar from '../components/NavBar';

const messageVariants = {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -100 }
};


const buttonVariants = {
    hover: { scale: 0.95 },
    tap: { scale: 1.05 }
};


const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

// // Add these keyboard interaction helpers
// const handleButtonKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
//     if (e.key === 'Enter' || e.key === ' ') {
//         e.preventDefault();
//         callback();
//     }
// };

const ChatApp = () => {

    const [text, setText] = useState<string>("");
    const [messages, setMessages] = useState<{ id: number; lang: string | null; select: string; summarizeLoader: boolean; text: string; percent: number | null; loading: boolean; error: string | null; summary: string | null; translatedText: string | null; }[]>([]);
    const [isSend, setIsSend] = useState<boolean>(false);
    const [welcomeMessage, setWelcomeMessage] = useState<boolean>(true);
    const [isDark, setIsDark] = useState(false);

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
            //check if AI and languageDetector are supported
            if (typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "languageDetector" in self.ai) {
                console.log("AI and languageDetector are supported");
                const languageDetectorCapabilities = await (self.ai as { languageDetector: { capabilities: () => Promise<{ available: string }> } }).languageDetector?.capabilities();
                //initialize language detector model
                let detector;

                //check if language detector is available or not
                if (languageDetectorCapabilities?.available === 'no') {
                    console.error("Language detector is not available");
                    throw new Error("Language detector is not available");
                }
                if (languageDetectorCapabilities?.available === 'readily') {
                    //already downloaded to use
                    detector = await (self.ai as any).languageDetector?.create();
                    console.log("Language detector is readily available");
                } else {
                    //ready to download model if not available
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

                //if detector is not available, throw an error
                if (!detector) {
                    throw new Error("Failed to create detector");
                }

                //detect language of the message
                const checker = await detector.detect(messages[messageIndex].text);
                if (checker && checker.length > 0) {
                    //set language and confidence of the message
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

        // check if text is empty or not
        if (!text.trim()) {
            catchError(messages.length - 1, "Please enter a message");
            return;
        }
        //create new message and add to messages array
        const newMessage = {
            id: messages.length + 1,
            lang: null,
            select: "en",
            percent: null,
            text,
            summarizeLoader: false,
            loading: false,
            error: null,
            summary: null,
            translatedText: null,
        };

        setMessages(prev => [...prev, newMessage]);
        setText("");
        setIsSend(true);
    };

    //display language in human form
    const displayLang = (lang: string | null) => {
        if (lang) {
            const langInHuman = new Intl.DisplayNames([lang], { type: "language" });
            return langInHuman.of(lang);
        }
        return null;
    };

    // Select language onChange handler
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

    //summarize logic
    const onSummarize = async (messageIndex: number) => {
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, summarizeLoader: true } : msg
            )
        );
        try {
            const message = messages[messageIndex];
            if (message.text.length >= 150) {
                //check if summarizer is in self.ai
                if (typeof self === "object" && self && "ai" in self && typeof self.ai === "object" && self.ai !== null && "summarizer" in self.ai) {
                    const summarizerCapa = await (self.ai as { summarizer: { capabilities: () => Promise<{ available: string }> } }).summarizer?.capabilities();
                    let summarize;

                    //check if summarizer is available or not
                    if (summarizerCapa?.available === 'no') {
                        console.error("Summarizer is not available");
                        throw new Error("Summarizer is not available");
                    } else if (summarizerCapa?.available === 'readily') {
                        //already downloaded to use
                        summarize = await (self.ai as any).summarizer?.create();
                        console.log("Summarizer is readily available");
                    } else {
                        // ready to download summarizer model
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
                            index === messageIndex ? { ...msg, summary: summaryResult, summarizeLoader: false } : msg
                        )
                    );

                }
            }
        } catch (err) {
            catchError(messageIndex, err instanceof Error ? err.message : "Summarization failed");
        }
    };

    //onKeyPress handler for textarea
    const onKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const target = e.target as HTMLTextAreaElement;
        if (!target.value.trim()) return;
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMsg();
        }
    }

    const handleSendMsg = () => {
        //create a new event and dispatch it to the form
        const event = new Event('submit', { bubbles: true, cancelable: true });
        const form = document.querySelector('form');
        form?.dispatchEvent(event);
    }

    //translate logic
    const onTranslate = async (messageIndex: number) => {

        const currentMessages = [...messages];
        const message = currentMessages[messageIndex];

        // Set loading state only for the specific message
        setMessages(prevMessages =>
            prevMessages.map((msg, index) =>
                index === messageIndex ? { ...msg, loading: true } : msg
            )
        );

        try {
            // check if language and select are detected and not the same language
            if (!message.lang || !message.select) throw new Error("Language not detected or not selected");
            if (message.select === message.lang) throw new Error("Cannot translate to the same language");

            //initialize translator model
            let translate;

            //check if the model is supported or not
            if (typeof self === 'object' && "ai" in self && self && typeof self.ai === "object" && self.ai !== null) {
                console.log("Translate is supported");
                // check if the model is available or not
                const translateCapa = await (self.ai as any)?.translator?.capabilities();


                // check if the model is available or not
                if (translateCapa === 'no') throw new Error("Translate is not available");
                if (translateCapa === 'readily') {
                    //already downloaded to use
                    translate = await (self.ai as any).translator.create();
                } else {
                    console.log("Ready to download Translator AI model");
                    // ready to download summarizer model
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

                //if translator is not available, throw an error
                if (!translate) throw new Error("Failed to create translator");

                // translate the message
                const translatedText = await translate.translate(message.text);


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

    // Add this at the top of your component
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
        }
    }, []);

    const toggleTheme = () => {
        setIsDark(prev => {
            const newTheme = !prev;
            localStorage.setItem('theme', newTheme ? 'dark' : 'light');
            return newTheme;
        });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setWelcomeMessage(false);
        }, 6000);

        return () => clearTimeout(timer);
    }, [])

    return (
        <div className={`relative min-h-screen ${isDark ? 'dark' : ''}`} role="main" aria-label="Chat Application">
            <Navbar isDark={isDark} toggleTheme={toggleTheme} />

            <div className="pt-16 bg-[var(--primary-bg)]">
                <AnimatePresence mode="wait">
                    {welcomeMessage && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-[#27568B]/50 backdrop-blur-sm"
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.h1
                                    initial={{ opacity: 0, y: 20, scale: 0.5 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -100 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="font-roadRage text-[#C9DDEE] text-center font-extrabold text-[2rem] md:text-[4rem] tracking-wider mb-20"
                                >
                                    Welcome to MaaH-MooD ChatApp
                                </motion.h1>
                                <div className="relative w-full h-[60vh]">
                                    <motion.p
                                        initial={{ opacity: 0, x: -100 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="absolute font-roadRage animate-pulse text-[#C9DDEE] text-center font-extrabold text-[1rem] md:text-[2rem] top-[30%] left-[10%]"
                                    >
                                        This is a simple chat with app AI capabilities.
                                    </motion.p>
                                    <motion.p
                                        initial={{ opacity: 0, x: 100 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1 }}
                                        className="absolute animate-pulse font-roadRage text-[#C9DDEE] text-center font-extrabold text-[1rem] md:text-[2rem] top-[30%] right-[10%]"
                                    >
                                        You can send messages
                                    </motion.p>
                                    <motion.p
                                        initial={{ opacity: 0, x: -100 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 1.5 }}
                                        className="absolute animate-pulse font-roadRage text-[#C9DDEE] text-center font-extrabold text-[1rem] md:text-[2rem] bottom-[30%] left-[10%]"
                                    >
                                        You can translate them
                                    </motion.p>
                                    <motion.p
                                        initial={{ opacity: 0, x: 100 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 2 }}
                                        className="absolute animate-pulse font-roadRage text-[#C9DDEE] text-center font-extrabold text-[1rem] md:text-[2rem] bottom-[30%] right-[10%]"
                                    >
                                        You can summarize them.
                                    </motion.p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    variants={containerVariants}
                    initial="initial"
                    animate={!welcomeMessage ? "animate" : "initial"}
                    className="w-full max-w-4xl mx-auto relative flex flex-col min-h-screen p-4 md:p-8 bg-[var(--chat-bg)] text-[var(--chat-text)]"
                    role="region"
                    aria-label="Chat messages"
                >
                    <div className="flex-1 overflow-y-auto">

                        {messages.length > 0 ? (
                            <AnimatePresence>
                                <div className="mb-4 flex flex-col space-y-6">
                                    {messages.map((data, index) => (
                                        <motion.article
                                            key={index}
                                            variants={messageVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="mb-4 transition-all"
                                            layout
                                            role="article"
                                            aria-label={`Message ${index + 1}`}
                                        >
                                            <div
                                                className="flex flex-row justify-end"

                                            >
                                                <p className="p-4 items-end border whitespace-pre-wrap break-words border-[var(--accent)] rounded-2xl text-[1rem] md:text-[1.2rem] w-fit max-w-[90%] md:max-w-[80%] bg-[var(--secondary-bg)] text-[var(--primary-text)] mb-2 shadow-lg">
                                                    {data.text}
                                                </p>
                                            </div>

                                            {displayLang(data.lang) && data.percent !== null && (
                                                <motion.p
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="mb-4 justify-end flex text-green-600 text-sm md:text-base"
                                                >
                                                    I am {(data.percent * 100).toFixed(2)}% sure that this is an/a {displayLang(data.lang)} language 🤟
                                                </motion.p>
                                            )}

                                            <div className="justify-end items-center flex flex-wrap gap-2">
                                                <label htmlFor={`select`} className="mb-4 mr-2">
                                                    Translate to
                                                </label>
                                                <select
                                                    id={`select`}
                                                    value={data.select}
                                                    onChange={(e) => onSelectChange(e, index)}
                                                    className="text-[var(--chat-text)] border mr-4 border-[var(--chat-text)] py-2 px-4 rounded mb-4 bg-[var(--chat-bg)] backdrop-blur-sm focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none"
                                                    aria-label="Select target language"
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
                                                    className={`bg-[var(--primary-bg)] ${data.loading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} text-[var(--primary-text)] py-2 px-4 rounded mb-4 shadow-md hover:shadow-lg transition-shadow focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none`}
                                                    aria-label={data.loading ? 'Translating message' : 'Translate message'}
                                                    aria-busy={data.loading}
                                                >
                                                    {data.loading ? 'Translating...' : 'Translate'}
                                                </motion.button>
                                            </div>

                                            {data.text.length >= 150 && data.lang !== null && data.lang === 'en' && !data.summary && (
                                                <motion.div className="flex justify-end">
                                                    <motion.button
                                                        variants={buttonVariants}
                                                        whileHover="hover"
                                                        whileTap="tap"
                                                        disabled={data.summarizeLoader}
                                                        onClick={() => onSummarize(index)}
                                                        className={`${data?.summarizeLoader ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} bg-[#27568B] text-white py-2 px-4 rounded mb-4 shadow-md hover:shadow-lg flex justify-center items-center transition-shadow focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none`}
                                                        aria-label={data.summarizeLoader ? 'Summarizing message' : 'Summarize message'}
                                                        aria-busy={data.summarizeLoader}
                                                    >
                                                        {data.summarizeLoader ? <span className="animate-spin" aria-hidden="true"><FiLoader /></span> : 'Summarize'}
                                                    </motion.button>
                                                </motion.div>
                                            )}
                                            {data?.summarizeLoader && <span className="w-full text-center flex justify-center mb-4">Kindly be patient</span>}
                                            <div className={`${data.summarizeLoader ? " h-[15rem]" : ""}`}>
                                                {data?.summarizeLoader && <span className="w-full h-full rounded-2xl overflow-hidden"><img className="object-fit  w-full overflow-hidden h-full" src="/assets/78259-loading.gif" alt="loading" /></span>}
                                            </div>

                                            <AnimatePresence>
                                                {data.error && (
                                                    <motion.p
                                                        role="alert"
                                                        aria-live="polite"
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
                                                        className="p-4 items-end list-none border border-[#B68250] rounded-2xl text-[1rem] md:text-[1.2rem] whitespace-pre-wrap break-words w-fit max-w-[90%] md:max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-4 shadow-lg"
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
                                                        className="p-4 items-end list-none border border-[#B68250] rounded-2xl text-[1rem] md:text-[1.2rem] whitespace-pre-wrap break-words w-fit max-w-[90%] md:max-w-[80%] bg-[#47A1C4] text-[#27568B] mb-4 shadow-lg"
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
                            </AnimatePresence>)
                            : <p className="text-center text-[#27568B] text-2xl mt-8" role="status">Type a message to start chatting...</p>
                        }
                    </div>

                    <motion.form
                        onSubmit={sendMsg}
                        className="w-full mt-4"
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        role="form"
                        aria-label="Message input form"
                    >
                        <div className="relative">
                            <label htmlFor="message-input" className="sr-only">
                                Type your message
                            </label>
                            <textarea
                                id="message-input"
                                className="w-full border-gray-400 rounded-2xl min-h-[8rem] md:min-h-[10rem] border p-4 pr-10 bg-[var(--primary-bg)] text-[var(--primary-text)] resize-none shadow-lg focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none"
                                placeholder="Send message..."
                                value={text}
                                onChange={onTextChange}
                                onKeyPress={onKeyPress}
                                aria-label="Message input"
                            />
                            <motion.button
                                type="submit"
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                                className="text-[#B68250] absolute bottom-4 right-4 cursor-pointer hover:bg-[#47A1C4] font-bold p-2 rounded-full bg-white/10 backdrop-blur-sm focus:ring-2 focus:ring-[#B68250] focus:border-transparent outline-none"
                                aria-label="Send message"
                            >
                                <IoMdSend size={24} aria-hidden="true" />
                            </motion.button>
                        </div>
                    </motion.form>
                </motion.div>
            </div>
        </div>
    );
};

export default ChatApp;