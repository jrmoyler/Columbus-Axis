import { useEffect, useState, type ComponentType } from "react";
import { TitleScreen, Briefing } from "./ui/TitleScreen";
import { HUD } from "./ui/HUD";
import { persistEmpire } from "./save";
import { resumeAudio, unlockAudio } from "./audio";
import { useEmpire } from "./store";

export function GameRoot() {
  const hydrate = useEmpire((s) => s.hydrate);
  const hydrated = useEmpire((s) => s.hydrated);
  const phase = useEmpire((s) => s.phase);
  const [City, setCity] = useState<ComponentType | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    let live = true;
    import("./world/CityCanvas").then((m) => {
      if (live) setCity(() => m.CityCanvas);
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") persistEmpire(useEmpire.getState());
      else resumeAudio();
    };
    const onHide = () => persistEmpire(useEmpire.getState());
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  return (
    <div className="axis-root" onPointerDown={() => unlockAudio()}>
      {City ? <City /> : <div className="axis-map-canvas axis-map-boot" aria-hidden />}
      {hydrated && phase === "title" ? <TitleScreen /> : null}
      {hydrated && phase === "briefing" ? <Briefing /> : null}
      {hydrated && phase !== "title" && phase !== "briefing" ? <HUD /> : null}
    </div>
  );
}
