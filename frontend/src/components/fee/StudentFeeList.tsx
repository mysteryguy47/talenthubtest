import { useState, useEffect } from "react";
import { 
  Search, Filter, User as UserIcon, DollarSign, Calendar, AlertCircle, 
  CheckCircle2, Eye, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { StudentFeeSummary, getStudentsWithFees } from "../../lib/feeApi";
import { StudentProfile, getAllStudents } from "../../lib/userApi";
import { BRANCHES, COURSES } from "../../constants/index";

interface StudentFeeListProps {
  onStudentClick: (student: StudentFeeSummary) => void;
  selectedBranch?: string;
  selectedCourse?: string;
  showOverdueOnly?: boolean;
}

export default function StudentFeeList({ 
  onStudentClick, 
  selectedBranch, 
  selectedCourse,
  showOverdueOnly = false 
}: StudentFeeListProps) {
  const [students, setStudents] = useState<StudentFeeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"balance" | "name" | "due_date">("balance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

  useEffect(() => {
    loadStudents();
  }, [selectedBranch, selectedCourse, showOverdueOnly]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentsWithFees({
        branch: selectedBranch || undefined,
        course: selectedCourse || undefined,
        show_overdue_only: showOverdueOnly,
      });
      setStudents(data);
    } catch (err: any) {
      setError(err.message || "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleSort = (field: "balance" | "name" | "due_date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filteredAndSortedStudents = students
    .filter((student) => {
      const search = searchTerm.toLowerCase();
      return (
        student.student_name.toLowerCase().includes(search) ||
        student.student_public_id?.toLowerCase().includes(search) ||
        ""
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "balance") {
        comparison = a.balance - b.balance;
      } else if (sortBy === "name") {
        comparison = a.student_name.localeCompare(b.student_name);
      } else if (sortBy === "due_date" && a.next_due_date && b.next_due_date) {
        comparison = new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("balance")}
            className={`px-4 py-2.5 rounded-lg border transition-colors ${
              sortBy === "balance"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
            }`}
          >
            Sort by Balance
          </button>
          <button
            onClick={() => handleSort("due_date")}
            className={`px-4 py-2.5 rounded-lg border transition-colors ${
              sortBy === "due_date"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
            }`}
          >
            Sort by Due Date
          </button>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-3">
        {filteredAndSortedStudents.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <UserIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No students found</p>
          </div>
        ) : (
          filteredAndSortedStudents.map((student) => (
            <div
              key={student.student_profile_id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedStudent(expandedStudent === student.student_profile_id ? null : student.student_profile_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        {student.student_name}
                      </h3>
                      {student.student_public_id && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          ({student.student_public_id})
                        </span>
                      )}
                      {student.is_overdue && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                          Overdue ({student.overdue_days} days)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 mb-1">Balance</div>
                        <div className={`font-semibold ${student.balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
                          {formatCurrency(student.balance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 mb-1">Total Paid</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(student.total_paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 mb-1">Total Due</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(student.total_due)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400 mb-1">Next Due Date</div>
                        <div className={`font-semibold ${student.is_overdue ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-100"}`}>
                          {formatDate(student.next_due_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStudentClick(student);
                      }}
                      className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {expandedStudent === student.student_profile_id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedStudent === student.student_profile_id && student.current_assignment && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-200 dark:border-slate-700">
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Fee Plan</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {student.current_assignment.fee_plan?.name || "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Effective Fee</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(student.current_assignment.effective_fee_amount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Discount</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {student.current_assignment.discount_amount > 0 || student.current_assignment.discount_percentage > 0
                          ? `${formatCurrency(student.current_assignment.discount_amount)} (${student.current_assignment.discount_percentage}%)`
                          : "No discount"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 mb-1">Start Date</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {formatDate(student.current_assignment.start_date)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
