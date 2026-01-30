"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { subscribeToPatients, updatePatientStatus } from "@/lib/patient-service"
import type { Patient, PatientStatus } from "@/lib/types"
import { CRITICALITY_CONFIG, STATUS_CONFIG } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoadingSpinner } from "@/components/loading-spinner"
import { EmptyState } from "@/components/empty-state"
import { LogOut, Stethoscope, Users, Clock, CheckCircle, AlertTriangle } from "lucide-react"

export function DoctorDashboard() {
  const { logout } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingPatient, setUpdatingPatient] = useState<string | null>(null)

  useEffect(() => {
    console.log("[v0] Doctor dashboard: Setting up real-time subscription")
    const unsubscribe = subscribeToPatients((updatedPatients) => {
      console.log("[v0] Doctor dashboard received update:", updatedPatients.length, "patients")
      // Sort: Emergency first, then by queue number
      const sorted = [...updatedPatients].sort((a, b) => {
        // Emergency patients first
        if (a.criticalLevel === "emergency" && b.criticalLevel !== "emergency") return -1
        if (a.criticalLevel !== "emergency" && b.criticalLevel === "emergency") return 1
        // Then by queue number (FIFO)
        return a.queueNumber - b.queueNumber
      })
      setPatients(sorted)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleStatusChange = async (patientId: string, newStatus: PatientStatus) => {
    console.log("[v0] Doctor updating patient status:", patientId, "to:", newStatus)
    setUpdatingPatient(patientId)
    try {
      await updatePatientStatus(patientId, newStatus)
      console.log("[v0] Patient status updated successfully in Firebase")
    } catch (error) {
      console.error("[v0] Failed to update status:", error)
    } finally {
      setUpdatingPatient(null)
    }
  }

  // Calculate stats
  const stats = {
    total: patients.length,
    waiting: patients.filter((p) => p.status === "waiting").length,
    inConsultation: patients.filter((p) => p.status === "in_consultation").length,
    completed: patients.filter((p) => p.status === "completed").length,
    emergency: patients.filter((p) => p.criticalLevel === "emergency").length,
  }

  // Filter active patients (not completed) for main queue view
  const activePatients = patients.filter((p) => p.status !== "completed")

  if (loading) {
    return <LoadingSpinner message="Loading patient queue..." />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <Stethoscope className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Doctor Dashboard</h1>
              <p className="text-sm text-muted-foreground">Patient Queue Management</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout} className="gap-2 bg-transparent">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.waiting}</p>
                  <p className="text-sm text-muted-foreground">Waiting</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Stethoscope className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.inConsultation}</p>
                  <p className="text-sm text-muted-foreground">In Consultation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{stats.emergency}</p>
                  <p className="text-sm text-muted-foreground">Emergency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Queue</CardTitle>
            <CardDescription>
              Emergency patients are shown first. Update status as patients are seen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activePatients.length === 0 ? (
              <EmptyState
                title="No patients in queue"
                description="Waiting for patients to register"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Queue #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-16">Age</TableHead>
                      <TableHead>Symptom</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-48">Update Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePatients.map((patient) => {
                      const criticalityConfig = CRITICALITY_CONFIG[patient.criticalLevel]
                      const statusConfig = STATUS_CONFIG[patient.status]

                      return (
                        <TableRow
                          key={patient.id}
                          className={
                            patient.criticalLevel === "emergency"
                              ? "bg-destructive/5 border-l-4 border-l-destructive"
                              : ""
                          }
                        >
                          <TableCell className="font-bold text-lg">
                            #{patient.queueNumber}
                          </TableCell>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>{patient.age}</TableCell>
                          <TableCell className="capitalize">
                            {patient.symptoms.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge className={criticalityConfig.className}>
                              {criticalityConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusConfig.className}>
                              {statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={patient.status}
                              onValueChange={(value) =>
                                handleStatusChange(patient.id, value as PatientStatus)
                              }
                              disabled={updatingPatient === patient.id}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="waiting">Waiting</SelectItem>
                                <SelectItem value="in_consultation">In Consultation</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Patients */}
        {stats.completed > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">Completed Today</CardTitle>
              <CardDescription>
                Patients who have completed their consultation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Queue #</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Symptom</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients
                      .filter((p) => p.status === "completed")
                      .map((patient) => (
                        <TableRow key={patient.id} className="opacity-60">
                          <TableCell>#{patient.queueNumber}</TableCell>
                          <TableCell>{patient.name}</TableCell>
                          <TableCell>{patient.age}</TableCell>
                          <TableCell className="capitalize">
                            {patient.symptoms.replace("_", " ")}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500 text-white">Completed</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
