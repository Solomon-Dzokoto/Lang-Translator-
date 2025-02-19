import ContextApi from "./context/ContextApi"
import ChatApp from "./pages/ChatApp"


const App = () => {


  return (
    <div className="min-h-screen bg-[#27568B]  ">
      <ContextApi>
        <ChatApp />
      </ContextApi>
    </div>
  )
}

export default App
