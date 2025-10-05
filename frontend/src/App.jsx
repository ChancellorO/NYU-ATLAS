import { useRef, useState, useEffect } from "react";
import Map from "./components/Map";
import "./App.css";
import { Chatbot } from "./components/ChatBot";
import SnoopyLoader from "./components/SnoopyLoader";

const INITIAL_CENTER = [-73.9855, 40.7580];
const INITIAL_ZOOM = 11;

export default function App() {
  const mapHandle = useRef(null);
  const botRef = useRef(null);
  const [botMessage, setBotMessage] = useState("Okay, roger that! Snoopy Event Planner here, ready to report on the weather...\n Try searching a place to get started!");
  // handles center and zoom
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  const handleMove = (lng, lat, z) => {
    setCenter([lng, lat]);
    setZoom(z);
  };

  const handleReset = () => {
    mapHandle.current?.flyHome();
  };

  useEffect(() => {
    botRef.current?.notify(botMessage)
  }, [botMessage])

  return (
    <>
      <SnoopyLoader show="always" durationMs={3000} />
      <div>
        <Map
          ref={mapHandle}
          initialCenter={INITIAL_CENTER}
          initialZoom={INITIAL_ZOOM}
          onMove={handleMove}
          setBotMessage={setBotMessage}
          
        />

        <Chatbot ref={botRef} />
      </div>
    </>
  );
}

