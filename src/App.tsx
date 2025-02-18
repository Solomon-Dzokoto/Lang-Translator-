import ContextApi from "./context/ContextApi"
import ChatApp from "./pages/ChatApp"
import { useEffect,useState } from "react"

const App = () => {
  const [translaterChecker, setTranslateChecker] = useState<any>(null)

  useEffect(()=> {
    const translateFunc = async () => {

      if ( typeof self === 'object' && self && "ai" in self && typeof self.ai === 'object' && self.ai !== null && "i18n" in self ){
        console.log("i18n is supported")
      }
    }
  },[])

  return (
    <ContextApi>
      <ChatApp />
    </ContextApi>
  )
}

export default App
