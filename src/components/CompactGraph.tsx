import { Calendar, Day, Filter } from "../model.ts";

export function CompactGraph(
  { calendar, clickUrl }: {
    calendar: Calendar;
    clickUrl?: string;
  },
) {
  const dayMax = calendar.maxContributions();
  const filter = new Filter();

  const handleClick = clickUrl
    ? () => {
      globalThis.location.href = clickUrl;
    }
    : undefined;

  return (
    <table
      className="contributions"
      onClick={handleClick}
      style={clickUrl ? { cursor: "pointer" } : undefined}
    >
      <tbody>
        {[...calendar.weeks()].map((week) => (
          <tr key={`week ${week[0].date}`} className="week">
            {week.map((day) => (
              <CompactDay
                key={day.date.toString()}
                day={day}
                filter={filter}
                max={dayMax}
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CompactDay(
  { day, filter, max }: {
    day: Day;
    filter: Filter;
    max: number;
  },
) {
  function countToLightness(count: number) {
    if (count) {
      return 59 * (1 - count / max) + 40;
    } else {
      return 100;
    }
  }

  interface Subdivision {
    key: string;
    style: React.CSSProperties;
  }
  let subdivisions: Subdivision[] = [];
  let style = {};
  const className: string[] = [];

  if (day.addsUp()) {
    subdivisions = day.filteredRepos(filter).map((repoDay) => ({
      key: repoDay.url(),
      style: {
        flex: repoDay.count(),
        background: repoDay.repository.color(
          countToLightness(day.filteredCount(filter)),
          0.1,
        ),
      },
    }));

    if (subdivisions.length == 0) {
      className.push("empty");
    }
  } else {
    const lightness = countToLightness(day.contributionCount || 0);
    className.push("unknown");
    style = {
      background: `hsl(270deg 40% ${lightness}%)`,
    };

    if (day.contributionCount === 0) {
      className.push("empty");
    }
  }

  return (
    <td style={style} className={className.join(" ")}>
      <ol>
        {subdivisions.map(({ key, style }) => <li key={key} style={style} />)}
      </ol>
    </td>
  );
}
