import Nav from "@/components/sections/Nav";
import FogHero from "@/components/sections/FogHero";
import WhoWeAre from "@/components/sections/WhoWeAre";
import ServicesLedger from "@/components/sections/ServicesLedger";
import FeeCalculator from "@/components/sections/FeeCalculator";
import DeskSequence from "@/components/sections/DeskSequence";
import Underwriter from "@/components/sections/Underwriter";
import Footer from "@/components/sections/Footer";

/* The fog hero superseded both the type-only hero (now its fallback) and the
   standalone coverage section — the 48-states claim is the sequence's ignition
   beat, and the Hawaii/Iowa honesty line lives under the calculator. */
export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <FogHero />
        {/* Pale-fog statement section — absorbs the old Positioning
            statement; the cream now opens with Services. */}
        <WhoWeAre />
        <ServicesLedger />
        <FeeCalculator />
        <DeskSequence />
        <Underwriter />
      </main>
      <Footer />
    </>
  );
}
