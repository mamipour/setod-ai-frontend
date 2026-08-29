import { Callout, DocHeader, List, NextUp, P, Section, Table, C } from "@/components/help/doc"
import { nextPage } from "../nav"

export const metadata = { title: "Help  -  Triggers and schedules" }

export default function SchedulesHelp() {
  return (
    <>
      <DocHeader
        title="Triggers and schedules"
        lede="A trigger decides when an agent wakes up. An agent with no trigger only ever runs when you press Run."
      />

      <Section title="Presets">
        <P>
          Every preset is an ordinary cron expression underneath, so you can start with a
          preset and switch to a custom expression later without losing anything.
        </P>
        <Table
          head={["Preset", "Cron"]}
          rows={[
            ["Every 15 minutes", <C key="a">*/15 * * * *</C>],
            ["Every 30 minutes", <C key="b">*/30 * * * *</C>],
            ["Hourly", <C key="c">0 * * * *</C>],
            ["Every weekday 9am", <C key="d">0 9 * * 1-5</C>],
            ["Daily 9am", <C key="e">0 9 * * *</C>],
            ["Weekly Monday 9am", <C key="f">0 9 * * 1</C>],
          ]}
        />
      </Section>

      <Section title="Custom schedules and timezones">
        <P>
          A custom schedule takes a standard five-field cron expression  -  minute, hour, day of
          month, month, day of week. Pick a timezone alongside it and the schedule follows
          local time, including daylight saving. &ldquo;Daily 9am&rdquo; in New York keeps
          happening at 9am in New York when the clocks change.
        </P>
        <P>
          <strong>The minimum interval is five minutes.</strong> A single run can take a
          couple of minutes, so anything tighter would collide with itself.
        </P>
      </Section>

      <Callout tone="warn" title="Missed runs are skipped, not caught up">
        <p>
          If the platform is down for six hours, an hourly agent does not fire six times when
          it comes back. It fires once, at the next scheduled moment. This is deliberate  -  an
          agent that suddenly replayed six hours of backlog would be far more disruptive than
          one that missed a few checks  -  but it means a schedule is a best effort, not a
          guarantee.
        </p>
      </Callout>

      <Section title="A run that overruns its next slot">
        <P>
          If an agent is still working when its next scheduled time arrives, that slot is
          skipped entirely rather than starting a second copy. The agent picks up again at
          the following occurrence. Two copies of the same agent are never running at once,
          which is what stops a slow inbox agent from replying to everything twice.
        </P>
      </Section>

      <Section title="Pausing">
        <P>
          Turning a schedule off stops it immediately. Turning it back on starts counting
          forward from that moment, so a schedule paused over a weekend does not fire a
          burst of catch-up runs on Monday.
        </P>
      </Section>

      <Section title="Running by hand">
        <P>
          The Run button works whether or not a schedule exists, and is the normal way to
          check your work. It runs your draft rather than the published version  -  see{" "}
          <strong>Testing and publishing</strong> for why that distinction matters.
        </P>
      </Section>

      <Section title="What has to be true for a schedule to fire">
        <List>
          <li>The agent is published. Drafts never run on their own.</li>
          <li>The trigger is enabled.</li>
          <li>The agent is not already running.</li>
          <li>The background worker process is up.</li>
        </List>
        <P>
          If a scheduled run never happened and there is no failed run to look at, one of
          those four was false.
        </P>
      </Section>

      <Callout tone="info" title="Message-arrival triggers">
        <p>
          Triggering an agent the moment a message arrives is not available yet. Poll on a
          schedule instead  -  every 15 minutes is close enough to real time for most work, and
          the platform makes sure nothing gets handled twice.
        </p>
      </Callout>

      <NextUp {...nextPage("/help/schedules")!} />
    </>
  )
}
