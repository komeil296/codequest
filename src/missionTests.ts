
export type MissionTestResult = {
  passed: boolean
  message: string
}

type MissionTest = {
  id: number
  title: string
  check: (result: unknown) => boolean
  successMessage: string
  failureMessage: string
}

const mission2Tests: MissionTest[] = [
  {
    id: 1,
    title: 'امتیاز نهایی باید برابر ۱۰ باشد',
    check: (result) => result === 10,
    successMessage: 'آفرین! امتیاز نهایی ۱۰ است.',
    failureMessage: 'هنوز امتیاز نهایی ۱۰ نشده است.',
  },
]

export function validateMission(
  missionId: number,
  result: unknown,
): MissionTestResult[] {
  if (missionId === 2) {
    return mission2Tests.map((test) => {
      const passed = test.check(result)

      return {
        passed,
        message: passed ? test.successMessage : test.failureMessage,
      }
    })
  }

  return [
    {
      passed: false,
      message: 'برای این مأموریت هنوز آزمونی تعریف نشده است.',
    },
  ]
}
