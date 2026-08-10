'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { CheckboxField, SelectField } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { postJson } from '@/lib/client/request';
import type {
  ClassOption,
  SessionOption,
  SubjectOption,
  TeacherRow,
} from '@/lib/data/admin';

/**
 * Opens a class to a teacher.
 *
 * A teaching account reaches nothing until a row exists here, so this is the
 * control that actually grants access. Either one subject in a class, or the
 * form teacher assignment, which covers the whole class for attendance and
 * pastoral work.
 */
export function AssignTeacherForm({
  csrfToken,
  teachers,
  classes,
  subjects,
  sessions,
}: {
  csrfToken: string;
  teachers: TeacherRow[];
  classes: ClassOption[];
  subjects: SubjectOption[];
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isFormTeacher, setIsFormTeacher] = useState(false);

  const currentSession = sessions.find((session) => session.is_current) ?? sessions[0];
  const ready = teachers.length > 0 && classes.length > 0 && sessions.length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setDone(null);
    setFields({});

    const form = new FormData(event.currentTarget);

    const outcome = await postJson<{ message: string }>(
      '/api/admin/teachers/assign',
      {
        teacherId: String(form.get('teacherId') ?? ''),
        classId: String(form.get('classId') ?? ''),
        sessionId: String(form.get('sessionId') ?? ''),
        subjectId: isFormTeacher ? '' : String(form.get('subjectId') ?? ''),
        isFormTeacher,
      },
      csrfToken,
    );

    setPending(false);

    if (!outcome.ok) {
      setError(outcome.error ?? 'We could not save that assignment.');
      setFields(outcome.fields ?? {});
      return;
    }

    setDone(outcome.data?.message ?? 'Assignment saved.');
    router.refresh();
  }

  if (!ready) {
    return (
      <Alert tone="info" title="Not ready to assign yet">
        An assignment needs a teaching account, a class and an academic session. Create whichever of
        those is missing first.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="Teacher" name="teacherId" required error={fields.teacherId}>
          {teachers.map((teacher) => (
            <option key={teacher.teacher_id} value={teacher.teacher_id}>
              {teacher.full_name}, {teacher.staff_number}
            </option>
          ))}
        </SelectField>

        <SelectField label="Class" name="classId" required error={fields.classId}>
          {classes.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Subject"
          name="subjectId"
          error={fields.subjectId}
          disabled={isFormTeacher}
          hint={
            isFormTeacher
              ? 'Not used for a form teacher, who covers the whole class.'
              : subjects.length === 0
                ? 'No subjects have been created yet.'
                : undefined
          }
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Academic session"
          name="sessionId"
          required
          defaultValue={currentSession?.id}
          error={fields.sessionId}
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name}
              {session.is_current ? ' (current)' : ''}
            </option>
          ))}
        </SelectField>
      </div>

      <CheckboxField
        name="isFormTeacher"
        checked={isFormTeacher}
        onChange={(event) => setIsFormTeacher(event.target.checked)}
        label="Form teacher for this class, responsible for attendance and pastoral care across every subject"
      />

      <div>
        <Button type="submit" loading={pending} loadingLabel="Saving">
          Assign teacher
        </Button>
      </div>
    </form>
  );
}
