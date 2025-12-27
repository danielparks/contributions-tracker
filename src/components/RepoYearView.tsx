import { useState } from "react";
import { Calendar, Day, Filter } from "../model/index.ts";
import { CalendarHeatMap } from "./CalendarHeatMap.tsx";
import { RepositoryList } from "./RepositoryList.tsx";
import { SummaryBox } from "./SummaryBox.tsx";

export interface Props {
  calendar: Calendar;
}

/**
 * Displays a calendar heat map, summary box, and repository list.
 *
 * This component manages the interactive state (highlight, filter, and selected
 * day) and can use data loaded by the client (via React Query) or data loaded
 * server side and transmitted to the client as JSON.
 */
export function RepoYearView({
  calendar,
}: Props) {
  const [highlight, setHighlight] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(() => new Filter());
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  function handleDayClick(day: Day) {
    setSelectedDay((current) => current === day ? null : day);
  }

  return (
    <>
      <CalendarHeatMap
        calendar={calendar}
        filter={filter}
        highlight={highlight}
        selectedDay={selectedDay}
        onDayClick={handleDayClick}
      />
      <div className="info-container">
        <SummaryBox
          calendar={calendar}
          filter={filter}
          selectedDay={selectedDay}
        />
        <RepositoryList
          calendar={calendar}
          filter={filter}
          setFilter={setFilter}
          setHighlight={setHighlight}
        />
      </div>
    </>
  );
}

declare global {
  var setBaseline: (on: boolean) => void;
  interface GlobalThis {
    setBaseline: (on: boolean) => void;
  }
}

/**
 * Called from web inspector to toggle baseline grid.
 */
globalThis.setBaseline = (on: boolean) => {
  const list = document.querySelector(".info-container")!.classList;
  if (on) {
    list.add("baseline");
  } else {
    list.remove("baseline");
  }
};
