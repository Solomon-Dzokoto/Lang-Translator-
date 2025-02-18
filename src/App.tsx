import ContextApi from "./context/ContextApi"
import ChatApp from "./pages/ChatApp"
const App = () => {

  return (
    <ContextApi>
      <ChatApp />
    </ContextApi>
  )
}

export default App
