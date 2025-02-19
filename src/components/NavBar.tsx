import { motion } from "framer-motion";
import { FiGithub, FiMoon, FiSun } from "react-icons/fi";
interface NavbarProps {
    isDark: boolean;
    toggleTheme: () => void;
}

const Navbar = ({ isDark, toggleTheme }: NavbarProps) => {
    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed py-2 top-0 left-0 right-0 z-40 bg-[var(--primary-bg)]/80 backdrop-blur-sm shadow-lg"
        >
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                <motion.div
                    className="flex items-center space-x-2"
                    whileHover={{ scale: 1.05 }}
                >
                    <img
                        src="assets/logo.png"
                        alt="MaaH-MooD Logo"
                        className="w-8 h-8"
                    />
                    <span className="text-[var(--primary-text)] font-roadRage text-xl">
                        MaaH-MooD AI Chat
                    </span>
                </motion.div>

                <div className="flex items-center space-x-4">
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-[var(--secondary-bg)]/20"
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? (
                            <span className="text-[var(--primary-text)] w-5 h-5">
                                <FiSun />
                            </span>
                        ) : (
                            <span className="text-[var(--primary-text)] w-5 h-5">
                                <FiMoon />
                            </span>
                        )}
                    </motion.button>

                    <motion.a
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        href="https://github.com/Solomon-Dzokoto/Lang-Translator-"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full hover:bg-[var(--secondary-bg)]/20"
                        aria-label="View source on GitHub"
                    >
                        <span className="text-[var(--primary-text)] w-5 h-5">
                            <FiGithub />
                        </span>
                    </motion.a>
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;