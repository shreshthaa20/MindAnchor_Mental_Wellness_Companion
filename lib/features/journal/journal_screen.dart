import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/journal_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/glass_card.dart';

class JournalScreen extends ConsumerStatefulWidget {
  const JournalScreen({super.key});

  @override
  ConsumerState<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends ConsumerState<JournalScreen> {
  final titleController = TextEditingController();
  final contentController = TextEditingController();
  bool isSaving = false;

  @override
  void dispose() {
    titleController.dispose();
    contentController.dispose();
    super.dispose();
  }

  Future<void> saveJournal() async {
    if (titleController.text.trim().isEmpty ||
        contentController.text.trim().isEmpty) {
      return;
    }

    setState(() {
      isSaving = true;
    });

    try {
      await ref.read(journalProvider.notifier).addJournal(
            title: titleController.text.trim(),
            content: contentController.text.trim(),
          );

      titleController.clear();
      contentController.clear();
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

  /// A shared input style for the glass-on-glass text fields below —
  /// a subtle fill and border, distinct enough from the surrounding
  /// GlassCard to still read as "tappable" without a harsh outline.
  InputDecoration _glassInputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.05),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppTheme.pink, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 12,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final journals = ref.watch(journalProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text("Journal"),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
        child: Column(
          children: [
            // ── New entry, inside one glass card ──
            GlassCard(
              child: Column(
                children: [
                  TextField(
                    controller: titleController,
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration("Title"),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: contentController,
                    maxLines: 4,
                    style: const TextStyle(color: Colors.white),
                    decoration: _glassInputDecoration("Write your thoughts..."),
                  ),
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: GestureDetector(
                      onTap: isSaving ? null : saveJournal,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          gradient: AppTheme.accentGradient,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.violet.withValues(alpha: 0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Text(
                            isSaving ? "Saving..." : "Save Journal",
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // ── Journal history ──
            Expanded(
              child: journals.when(
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
                        "No journals yet",
                        style: TextStyle(color: Colors.white54),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: ref.read(journalProvider.notifier).loadJournals,
                    color: AppTheme.pink,
                    backgroundColor: AppTheme.surface,
                    child: ListView.separated(
                      padding: const EdgeInsets.only(bottom: 20),
                      itemCount: entries.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final journal = entries[index];

                        return GlassCard(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      journal.title,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: () async {
                                      try {
                                        await ref
                                            .read(journalProvider.notifier)
                                            .deleteJournal(journal.id);
                                      } catch (error) {
                                        if (!context.mounted) return;
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          SnackBar(
                                            content: Text(error.toString()),
                                          ),
                                        );
                                      }
                                    },
                                    child: const Icon(
                                      Icons.delete_outline_rounded,
                                      color: Colors.white38,
                                      size: 20,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                journal.content,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                  height: 1.5,
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