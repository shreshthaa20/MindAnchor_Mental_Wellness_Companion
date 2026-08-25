import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/mood_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/glass_card.dart';

class MoodScreen extends ConsumerStatefulWidget {
  const MoodScreen({super.key});

  @override
  ConsumerState<MoodScreen> createState() => _MoodScreenState();
}

class _MoodScreenState extends ConsumerState<MoodScreen> {
  String selectedMood = "";
  bool isSaving = false;

  // Paired with an emoji per mood — purely visual, doesn't change what
  // gets sent to the backend (still just the plain mood string).
  final moodOptions = const [
    ("Happy", "😊"),
    ("Calm", "😌"),
    ("Anxious", "😰"),
    ("Sad", "😢"),
    ("Stressed", "😖"),
  ];

  Future<void> saveMood() async {
    if (selectedMood.isEmpty) return;

    setState(() {
      isSaving = true;
    });

    try {
      await ref.read(moodProvider.notifier).addMood(selectedMood);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          // Removed the flat `backgroundColor: AppTheme.surface` override
          // in favor of just inheriting the global snackBarTheme (same
          // background/shape/border every other snackbar in the app
          // uses) — plus a pink check icon here specifically, so a
          // SUCCESS message reads as distinctly "on-brand positive"
          // rather than identical to a generic/error message.
          content: Row(
            children: [
              const Icon(
                Icons.check_circle_rounded,
                color: AppTheme.pink,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text("Saved: $selectedMood"),
            ],
          ),
        ),
      );
    } catch (error) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error.toString())),
      );
    } finally {
      if (mounted) {
        setState(() {
          isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final moodEntries = ref.watch(moodProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text("Mood Tracker"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "How are you feeling today?",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 18),

            // ── Mood chips ──
            // Replaces the default ChoiceChip (which uses Material's
            // built-in chip styling, hard to make match the glass look)
            // with a hand-built chip: gradient pill when selected,
            // glass pill when not.
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: moodOptions.map((option) {
                final (mood, emoji) = option;
                final isSelected = selectedMood == mood;

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      selectedMood = isSelected ? "" : mood;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      gradient: isSelected ? AppTheme.accentGradient : null,
                      color: isSelected ? null : AppTheme.glassFill,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected
                            ? Colors.transparent
                            : AppTheme.glassBorder,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppTheme.violet.withValues(alpha: 0.4),
                                blurRadius: 14,
                                offset: const Offset(0, 4),
                              ),
                            ]
                          : null,
                    ),
                    child: Text(
                      "$emoji $mood",
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.white70,
                        fontSize: 13,
                        fontWeight: isSelected
                            ? FontWeight.w600
                            : FontWeight.w400,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // ── Save button ──
            SizedBox(
              width: double.infinity,
              child: GestureDetector(
                onTap: isSaving ? null : saveMood,
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    gradient: selectedMood.isEmpty
                        ? null
                        : AppTheme.accentGradient,
                    color: selectedMood.isEmpty
                        ? AppTheme.glassFill
                        : null,
                    borderRadius: BorderRadius.circular(16),
                    border: selectedMood.isEmpty
                        ? Border.all(color: AppTheme.glassBorder)
                        : null,
                    boxShadow: selectedMood.isEmpty
                        ? null
                        : [
                            BoxShadow(
                              color: AppTheme.violet.withValues(alpha: 0.35),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                  ),
                  child: Center(
                    child: Text(
                      isSaving ? "Saving..." : "Save Mood",
                      style: TextStyle(
                        color: selectedMood.isEmpty
                            ? Colors.white54
                            : Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            const Text(
              "Mood History",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 10),

            Expanded(
              child: moodEntries.when(
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.pink),
                ),
                error: (error, _) => Center(
                  child: Text(
                    error.toString(),
                    style: const TextStyle(color: Colors.white70),
                  ),
                ),
                data: (entries) {
                  if (entries.isEmpty) {
                    return const Center(
                      child: Text(
                        "No moods logged yet",
                        style: TextStyle(color: Colors.white54),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: ref.read(moodProvider.notifier).loadMoods,
                    color: AppTheme.pink,
                    backgroundColor: AppTheme.surface,
                    child: ListView.separated(
                      padding: const EdgeInsets.only(bottom: 20),
                      itemCount: entries.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final mood = entries[index];

                        return GlassCard(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          child: Row(
                            children: [
                              // Small icon badge — a tinted circle behind
                              // the heart icon, instead of a bare Icon
                              // sitting directly on the glass background.
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  color: AppTheme.pink.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(
                                  Icons.favorite_rounded,
                                  color: AppTheme.pink,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      mood.mood,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      mood.createdAt.toString(),
                                      style: const TextStyle(
                                        color: Colors.white38,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: () async {
                                  try {
                                    await ref
                                        .read(moodProvider.notifier)
                                        .deleteMood(mood.id);
                                  } catch (error) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(error.toString()),
                                      ),
                                    );
                                  }
                                },
                                icon: const Icon(
                                  Icons.delete_outline_rounded,
                                  color: Colors.white38,
                                  size: 20,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}