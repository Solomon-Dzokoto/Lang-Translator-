import {createContext,useContext,useState,useEffect} from 'react';

export const Context = createContext(null);
const ContextApi: React.FC<{children: React.ReactNode}> = ({children}) => {
    const func = async () => {
    if ( "ai" in self ){
       
       console.log("")
    }
}

useEffect(() => {
    func()
},[])


    
  return (
    <Context.Provider value={{}}>
      {children}
    </Context.Provider>
  )
}

export default ContextApi

import React from 'react'

export const useContextData = () => {
    const context = useContext(Context)
    if (context === undefined){
        throw new Error('useContextData must be used within a ContextApi')
    }
  return context
}



