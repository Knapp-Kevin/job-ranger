import { BookOpenText } from "lucide-react";
import { useCareerEvidence } from "../career/evidence";
import { CareerStoriesPanel } from "../components/CareerStoriesPanel";
import { Layout } from "../components/Layout";

export function CareerStories() {
  const careerEvidence = useCareerEvidence();
  const confirmedEvidence = careerEvidence.confirmed.map(({ evidence }) => evidence);

  return (
    <Layout>
      <section className="panel panel-strong px-6 py-7 sm:px-8">
        <span className="alpha-pill">
          <BookOpenText className="h-3.5 w-3.5" />
          Reusable narrative
        </span>
        <h1 className="page-title mt-4">Turn proven work into stories you can tell clearly.</h1>
        <p className="page-copy">
          Career Stories help you organize confirmed experience for interviews, networking, and later
          application materials. They stay linked to Career Evidence, so a polished story never gets
          mistaken for a new career fact.
        </p>
      </section>

      {careerEvidence.error && (
        <section className="support-note mt-6 px-5 py-4 text-sm text-[var(--color-danger)]">
          {careerEvidence.error}
        </section>
      )}

      <CareerStoriesPanel evidence={confirmedEvidence} />
    </Layout>
  );
}
